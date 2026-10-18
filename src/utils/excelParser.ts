import * as XLSX from 'xlsx';
import { ColumnMappingConfig } from '../types';

// ═══════════════════════════════════════════════════════════════
// EXCEL PARSING
// Pure functions (no DOM) so they run in a Web Worker and in tests.
// Counting rule: one case per non-blank data row (activity level).
// ═══════════════════════════════════════════════════════════════

/** Stable per-row identity. Overrides, edits and deletes are keyed by this, never by application number. */
export const ROW_ID_KEY = '_rowId';

/** How many rows from the top of a sheet are scanned when looking for the header row. */
const HEADER_SCAN_DEPTH = 25;

/** Hard limits so a hostile or corrupt file can't exhaust memory (real MC reports: ~2.5k × 47). */
export const MAX_ROWS = 200_000;
export const MAX_COLS = 500;
const MAX_CELL_CHARS = 32_767; // Excel's own per-cell limit

/** Lowercase and strip everything except a–z / 0–9, so "Client Application No." → "clientapplicationno". */
export function normalizeHeader(h: unknown): string {
  return String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Accepted header spellings per field, in priority order (already normalized). */
export const COLUMN_ALIASES: Record<keyof ColumnMappingConfig, string[]> = {
  colClientApplicationNumber: ['clientapplicationnumber', 'clientapplicationno', 'clientappno', 'applicationnumber', 'applicationno', 'appno', 'caseid', 'caseno', 'id'],
  colClient: ['clientname', 'client'],
  colKM: ['kmrunningoneside', 'kmoneside', 'km', 'distance', 'totalkm', 'runningkm'],
  colKMFed: ['kmfeededbymis', 'kmfedbymis'],
  colKMUsed: ['kmusedforbilling', 'kmused', 'billingkm'],
  colStatus: ['casestatus', 'status'],
  colCity: ['cityname', 'city'],
  colState: ['state', 'statename'],
  colProduct: ['productname', 'product'],
  colActivity: ['activitytypes', 'activitytype'],
  colApplicant: ['applicantname', 'applicant'],
  colAppNo: ['clientapplicationnumber', 'clientapplicationno', 'clientappno', 'appno'],
  colVerifier: ['verifiername', 'verifier'],
  colRecDate: ['casereceiveddate', 'receiveddate'],
  colApptDate: ['appointmentdate'],
  colCloseDate: ['casecloseddate', 'closeddate'],
  colTAT: ['tatreceiveddays', 'tat'],
  colFinalSt: ['finalstatus'],
  colLoanAmt: ['appliedloanamt', 'appliedloanamount', 'loanamount', 'loanamt'],
  colBranch: ['branchname', 'branch'],
  colActivityNm: ['activityname'],
  colDeletionDate: ['deletiondate', 'deleteddate', 'deletedon'],
};

// Generic aliases ("id", "km", "status"…) match too many unrelated sheets, so header
// detection only scores the specific ones.
const HEADER_SIGNAL = new Set(
  Object.values(COLUMN_ALIASES)
    .flat()
    .filter((a) => a.length > 4)
);

export function detectColumnNames(source: Record<string, any> | string[]): ColumnMappingConfig {
  const headers = Array.isArray(source) ? source : Object.keys(source);
  const byNorm = new Map<string, string>();
  headers.forEach((h) => {
    if (h.startsWith('_')) return;
    const n = normalizeHeader(h);
    if (n && !byNorm.has(n)) byNorm.set(n, h);
  });

  const out = {} as ColumnMappingConfig;
  (Object.keys(COLUMN_ALIASES) as (keyof ColumnMappingConfig)[]).forEach((field) => {
    const hit = COLUMN_ALIASES[field].find((a) => byNorm.has(a));
    out[field] = hit ? byNorm.get(hit)! : null;
  });
  return out;
}

// Values people type into a "deletion date" cell to mean "not deleted".
const NOT_DELETED_MARKERS = new Set(['', '-', '--', '0', 'na', 'n/a', 'nil', 'null', 'none', 'nan', '#n/a']);

export function isDeletionMarked(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return !NOT_DELETED_MARKERS.has(String(value).trim().toLowerCase());
}

export interface SheetSummary {
  name: string;
  /** 1-based Excel row number of the detected header. */
  headerRowNumber: number;
  /** Non-blank data rows below the header. */
  dataRows: number;
  headerScore: number;
}

export interface ParseStats {
  sheetName: string;
  headerRowNumber: number;
  /** Rows below the header inside the sheet's used range. */
  scannedRows: number;
  blankRows: number;
  repeatedHeaderRows: number;
  /** Rows handed to the billing engine (= scanned − blank − repeated headers). */
  dataRows: number;
}

/** What the upload screen shows about the last import. */
export interface ImportSummary extends ParseStats {
  fileName: string;
  sheets: SheetSummary[];
}

export interface ParsedWorkbook {
  rows: Record<string, any>[];
  columns: string[];
  sheets: SheetSummary[];
  stats: ParseStats;
}

function cleanCell(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const s = v
      .slice(0, MAX_CELL_CHARS)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '') // control chars (keep \t \n \r)
      .replace(/[ ​﻿]/g, ' ')
      .trim();
    return s === '' ? null : s;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return v;
}

/** Typed value of one cell: numbers stay numbers, dates become the text Excel displays. */
function cellValue(cell: XLSX.CellObject | undefined): unknown {
  if (!cell) return null;
  switch (cell.t) {
    case 'n':
    case 'b':
      return cleanCell(cell.v);
    case 'd': {
      if (cell.w) return cleanCell(cell.w);
      const d = cell.v as Date;
      return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
    }
    case 'e': // #N/A, #REF! … — treat as empty
    case 'z':
      return null;
    default:
      return cleanCell(cell.v ?? cell.w);
  }
}

// Read cells directly: SheetJS 0.18.5 ignores `rawNumbers`, so sheet_to_json would turn a
// formatted number like 1234.5 into the string "1,234.5 km".
function readGrid(ws: XLSX.WorkSheet): { grid: unknown[][]; firstRowNumber: number } {
  if (!ws || !ws['!ref']) return { grid: [], firstRowNumber: 1 };
  const range = XLSX.utils.decode_range(ws['!ref']);
  // The declared range can claim a million rows (formatting applied to whole columns);
  // shrink it to the cells that actually exist before allocating anything.
  let maxR = range.s.r;
  let maxC = range.s.c;
  for (const addr of Object.keys(ws)) {
    if (addr[0] === '!') continue;
    const { r, c } = XLSX.utils.decode_cell(addr);
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  range.e.r = Math.min(range.e.r, maxR);
  range.e.c = Math.min(range.e.c, maxC);
  if (range.e.r - range.s.r + 1 > MAX_ROWS + HEADER_SCAN_DEPTH) {
    throw new Error(`The sheet has more than ${MAX_ROWS.toLocaleString('en-IN')} rows. Split it into smaller files.`);
  }
  if (range.e.c - range.s.c + 1 > MAX_COLS) {
    throw new Error(`The sheet has more than ${MAX_COLS} columns, which doesn't look like an MC report.`);
  }
  const cols =Array.from({ length: range.e.c - range.s.c + 1 }, (_, i) => XLSX.utils.encode_col(range.s.c + i));
  const grid: unknown[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowRef = XLSX.utils.encode_row(r);
    const row: unknown[] = new Array(cols.length);
    for (let c = 0; c < cols.length; c++) row[c] = cellValue(ws[cols[c] + rowRef]);
    grid.push(row);
  }
  return { grid, firstRowNumber: range.s.r + 1 };
}

function isBlank(row: unknown[]): boolean {
  return row.every((c) => c === null);
}

function scoreHeader(row: unknown[]): number {
  let score = 0;
  for (const c of row) if (c !== null && HEADER_SIGNAL.has(normalizeHeader(c))) score++;
  return score;
}

function findHeaderIndex(grid: unknown[][]): { index: number; score: number } {
  let best = { index: -1, score: 0 };
  const limit = Math.min(grid.length, HEADER_SCAN_DEPTH);
  for (let i = 0; i < limit; i++) {
    const s = scoreHeader(grid[i]);
    if (s > best.score) best = { index: i, score: s };
  }
  // Nothing recognisable: use the first non-blank row, like a plain spreadsheet import.
  if (best.score < 2) {
    const first = grid.findIndex((r) => !isBlank(r));
    return { index: first, score: best.score };
  }
  return best;
}

function buildHeaders(row: unknown[]): string[] {
  const seen = new Map<string, number>();
  return row.map((c, i) => {
    let h = c === null ? `Column ${XLSX.utils.encode_col(i)}` : String(c);
    const n = (seen.get(h) || 0) + 1;
    seen.set(h, n);
    if (n > 1) h = `${h} (${n})`;
    return h;
  });
}

/** A row that repeats the header (multi-page exports) — it is not a case. */
function isRepeatedHeader(cells: unknown[], headerNorm: string[]): boolean {
  return scoreHeader(cells) >= 2 && cells.every((c, i) => c === null || normalizeHeader(c) === headerNorm[i]);
}

function analyseSheet(name: string, ws: XLSX.WorkSheet) {
  const { grid, firstRowNumber } = readGrid(ws);
  const { index, score } = findHeaderIndex(grid);
  const body = index < 0 ? [] : grid.slice(index + 1);
  const headerNorm = index < 0 ? [] : grid[index].map(normalizeHeader);
  const dataRows = body.filter((r) => !isBlank(r) && !isRepeatedHeader(r, headerNorm)).length;
  return { name, grid, firstRowNumber, headerIndex: index, score, dataRows };
}

export interface ParseOptions {
  /** Force a specific sheet; otherwise the sheet whose header looks most like an MC report wins. */
  sheetName?: string;
}

export function parseWorkbook(data: ArrayBuffer | Uint8Array, options: ParseOptions = {}): ParsedWorkbook {
  // raw: CSV/TXT cells stay text, so application numbers keep leading zeros (no effect on .xlsx).
  const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: true });
  if (!wb.SheetNames.length) throw new Error('The workbook has no sheets.');

  const analysed = wb.SheetNames.map((n) => analyseSheet(n, wb.Sheets[n]));
  const sheets: SheetSummary[] = analysed.map((a) => ({
    name: a.name,
    headerRowNumber: a.headerIndex < 0 ? 0 : a.firstRowNumber + a.headerIndex,
    dataRows: a.dataRows,
    headerScore: a.score,
  }));

  let chosen = options.sheetName ? analysed.find((a) => a.name === options.sheetName) : undefined;
  if (options.sheetName && !chosen) throw new Error(`Sheet "${options.sheetName}" was not found in the workbook.`);
  if (!chosen) {
    chosen = [...analysed].sort((a, b) => b.score - a.score || b.dataRows - a.dataRows)[0];
  }

  const { grid, firstRowNumber, headerIndex, name } = chosen;
  if (headerIndex < 0) {
    return {
      rows: [],
      columns: [],
      sheets,
      stats: { sheetName: name, headerRowNumber: 0, scannedRows: 0, blankRows: 0, repeatedHeaderRows: 0, dataRows: 0 },
    };
  }

  const headerRow = grid[headerIndex];
  const body = grid.slice(headerIndex + 1);
  const width = body.reduce((w, r) => Math.max(w, r.length), headerRow.length);
  const padded = Array.from({ length: width }, (_, c) => (c < headerRow.length ? headerRow[c] : null));
  // Drop columns with neither a header nor any data (trailing formatted columns).
  const keep = padded.map((h, c) => h !== null || body.some((r) => r[c] !== undefined && r[c] !== null));
  const allHeaders = buildHeaders(padded);
  const columns = allHeaders.filter((_, c) => keep[c]);
  const headerNorm = padded.map(normalizeHeader);

  const rows: Record<string, any>[] = [];
  let blankRows = 0;
  let repeatedHeaderRows = 0;

  body.forEach((cells, i) => {
    if (isBlank(cells)) {
      blankRows++;
      return;
    }
    if (isRepeatedHeader(cells, headerNorm)) {
      repeatedHeaderRows++;
      return;
    }
    const excelRow = firstRowNumber + headerIndex + 1 + i;
    const obj: Record<string, any> = { [ROW_ID_KEY]: `r${excelRow}` };
    for (let c = 0; c < width; c++) {
      if (keep[c]) obj[allHeaders[c]] = c < cells.length ? cells[c] : null;
    }
    rows.push(obj);
  });

  return {
    rows,
    columns,
    sheets,
    stats: {
      sheetName: name,
      headerRowNumber: firstRowNumber + headerIndex,
      scannedRows: body.length,
      blankRows,
      repeatedHeaderRows,
      dataRows: rows.length,
    },
  };
}

/** Give rows that came from somewhere other than parseWorkbook (demo data, legacy storage) a stable id. */
export function withRowIds(rows: Record<string, any>[], prefix = 'r'): Record<string, any>[] {
  return rows.map((r, i) => (r[ROW_ID_KEY] ? r : { ...r, [ROW_ID_KEY]: `${prefix}${i + 1}` }));
}
