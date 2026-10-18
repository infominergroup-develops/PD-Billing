import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { detectColumnNames, isDeletionMarked, normalizeHeader, parseWorkbook, ROW_ID_KEY } from './excelParser';

type Sheet = { name: string; aoa: unknown[][]; ref?: string };

/** Build an .xlsx in memory and return its bytes, exactly as a browser upload would see them. */
function workbook(...sheets: Sheet[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, aoa, ref }) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (ref) ws['!ref'] = ref; // simulate formatted-but-empty trailing rows/cols
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

const HEADER = ['client_application_number', 'client_name', 'applicant_name', 'state', 'KM_Running_One_Side', 'case_status', 'deletion_date'];

describe('normalizeHeader / detectColumnNames', () => {
  it('ignores case, spaces, punctuation and line breaks', () => {
    expect(normalizeHeader(' Client Application No. ')).toBe('clientapplicationno');
    expect(normalizeHeader('KM\nRunning_One-Side')).toBe('kmrunningoneside');
  });

  it('maps header variants the old detector missed', () => {
    const cols = detectColumnNames(['Client Application No.', 'Client Name ', 'KM Feeded By MIS', 'Deletion-Date', 'Applied Loan Amount']);
    expect(cols.colClientApplicationNumber).toBe('Client Application No.');
    expect(cols.colClient).toBe('Client Name ');
    expect(cols.colKMFed).toBe('KM Feeded By MIS');
    expect(cols.colDeletionDate).toBe('Deletion-Date');
    expect(cols.colLoanAmt).toBe('Applied Loan Amount');
  });

  it('prefers the specific application-number column over a generic "ID"', () => {
    const cols = detectColumnNames(['ID', 'client_application_number']);
    expect(cols.colClientApplicationNumber).toBe('client_application_number');
  });

  it('ignores internal underscore-prefixed keys', () => {
    expect(detectColumnNames({ _rowId: 'r2', client_name: 'X' }).colClientApplicationNumber).toBeNull();
  });
});

describe('isDeletionMarked', () => {
  it.each([null, undefined, '', '  ', '-', '--', 'NA', 'n/a', 'NIL', 'null', 0, '0'])('treats %p as not deleted', (v) => {
    expect(isDeletionMarked(v)).toBe(false);
  });
  it.each(['2026-09-01', '01/09/2026', 'Deleted', 45900])('treats %p as deleted', (v) => {
    expect(isDeletionMarked(v)).toBe(true);
  });
});

describe('parseWorkbook', () => {
  it('counts one row per activity — repeated application numbers are all kept', () => {
    const buf = workbook({
      name: 'MC',
      aoa: [HEADER, ['APP-1', 'Acme', 'A', 'UP', 10, 'Completed', null], ['APP-1', 'Acme', 'A', 'UP', 12, 'Completed', null], ['APP-2', 'Acme', 'B', 'UP', 5, 'Completed', null]],
    });
    const out = parseWorkbook(buf);
    expect(out.rows).toHaveLength(3);
    expect(out.stats).toMatchObject({ scannedRows: 3, blankRows: 0, dataRows: 3 });
  });

  it('skips blank and whitespace-only rows and ignores an inflated declared range', () => {
    const buf = workbook({
      name: 'MC',
      aoa: [HEADER, ['APP-1', 'Acme', 'A', 'UP', 10, 'Completed', null], [null, '   ', ' ', null], ['APP-2', 'Acme', 'B', 'UP', 5, 'Completed', null]],
      ref: 'A1:G40',
    });
    const out = parseWorkbook(buf);
    expect(out.rows.map((r) => r.client_application_number)).toEqual(['APP-1', 'APP-2']);
    // Rows past the last real cell (declared range only) are never scanned.
    expect(out.stats.scannedRows).toBe(3);
    expect(out.stats.blankRows).toBe(1);
    expect(out.stats.dataRows).toBe(2);
  });

  it('finds the header below report title rows', () => {
    const buf = workbook({
      name: 'MC',
      aoa: [['Infominer MC Report — Sept 2026'], ['Generated 01-Oct-2026'], [], HEADER, ['APP-1', 'Acme', 'A', 'UP', 10, 'Completed', null]],
    });
    const out = parseWorkbook(buf);
    expect(out.stats.headerRowNumber).toBe(4);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].client_name).toBe('Acme');
    expect(out.rows[0][ROW_ID_KEY]).toBe('r5');
  });

  it('drops header rows repeated mid-sheet (multi-page exports)', () => {
    const buf = workbook({
      name: 'MC',
      aoa: [HEADER, ['APP-1', 'Acme', 'A', 'UP', 10, 'Completed', null], HEADER, ['APP-2', 'Acme', 'B', 'UP', 5, 'Completed', null]],
    });
    const out = parseWorkbook(buf);
    expect(out.rows).toHaveLength(2);
    expect(out.stats.repeatedHeaderRows).toBe(1);
    expect(out.sheets[0].dataRows).toBe(2); // sheet picker agrees with the import
  });

  it('picks the sheet that looks like case data, and honours an explicit sheet choice', () => {
    const buf = workbook(
      { name: 'Summary', aoa: [['Client', 'Total'], ['Acme', 3]] },
      { name: 'Activities', aoa: [HEADER, ['APP-1', 'Acme', 'A', 'UP', 10, 'Completed', null], ['APP-2', 'Acme', 'B', 'UP', 5, 'Completed', null]] }
    );
    const auto = parseWorkbook(buf);
    expect(auto.stats.sheetName).toBe('Activities');
    expect(auto.sheets.map((s) => [s.name, s.dataRows])).toEqual([
      ['Summary', 1],
      ['Activities', 2],
    ]);

    const forced = parseWorkbook(buf, { sheetName: 'Summary' });
    expect(forced.stats.sheetName).toBe('Summary');
    expect(forced.rows).toHaveLength(1);
    expect(() => parseWorkbook(buf, { sheetName: 'Nope' })).toThrow(/not found/);
  });

  it('keeps numbers numeric even when the cell is formatted', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([HEADER, ['APP-1', 'Acme', 'A', 'UP', 1234.5, 'Completed', null]]);
    ws['E2'].z = '#,##0.0" km"';
    XLSX.utils.book_append_sheet(wb, ws, 'MC');
    const out = parseWorkbook(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    expect(out.rows[0].KM_Running_One_Side).toBe(1234.5);
  });

  it('renders date cells as text and keeps them out of numeric fields', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([HEADER, ['APP-1', 'Acme', 'A', 'UP', 10, 'Completed', new Date(Date.UTC(2026, 8, 1))]], { cellDates: true });
    ws['G2'].z = 'dd-mm-yyyy';
    XLSX.utils.book_append_sheet(wb, ws, 'MC');
    const out = parseWorkbook(XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellDates: true }));
    expect(typeof out.rows[0].deletion_date).toBe('string');
    expect(out.rows[0].deletion_date).toMatch(/2026/);
  });

  it('de-duplicates header names and names blank headers that have data', () => {
    const buf = workbook({ name: 'MC', aoa: [['client_name', 'Remarks', 'Remarks', null], ['Acme', 'a', 'b', 'x']] });
    const out = parseWorkbook(buf);
    expect(out.columns).toEqual(['client_name', 'Remarks', 'Remarks (2)', 'Column D']);
    expect(out.rows[0]).toMatchObject({ Remarks: 'a', 'Remarks (2)': 'b', 'Column D': 'x' });
  });

  it('reads CSV uploads', () => {
    const csv = new TextEncoder().encode('client_application_number,client_name,KM_Running_One_Side\n00123,Acme,10\n,,\nAPP-2,Acme,5\n');
    const out = parseWorkbook(csv);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].client_application_number).toBe('00123'); // leading zeros preserved
    expect(out.rows[1].KM_Running_One_Side).toBe('5'); // text; parseKM reads it
  });

  it('returns no rows (rather than throwing) for an empty sheet', () => {
    const out = parseWorkbook(workbook({ name: 'Empty', aoa: [[]] }));
    expect(out.rows).toEqual([]);
  });
});

describe('parseWorkbook limits', () => {
  it('only scans rows that hold cells, not the declared range', () => {
    // (The writer itself walks the declared range, so keep the fixture's inflation moderate.)
    const out = parseWorkbook(workbook({ name: 'MC', aoa: [HEADER, ['APP-1', 'Acme', 'A', 'UP', 10, 'Completed', null]], ref: 'A1:G100000' }));
    expect(out.rows).toHaveLength(1);
    expect(out.stats.scannedRows).toBe(1);
  });

  it('rejects sheets wider than the column cap', () => {
    const wide = [Array.from({ length: 600 }, (_, i) => `c${i}`)];
    expect(() => parseWorkbook(workbook({ name: 'W', aoa: wide }))).toThrow(/columns/);
  });

  it('strips control characters from cell text', () => {
    const out = parseWorkbook(workbook({ name: 'MC', aoa: [HEADER, ['APP\u0000-1\u0007', 'Acme', 'A', 'UP', 10, 'Completed', null]] }));
    expect(out.rows[0].client_application_number).toBe('APP-1');
  });
});
