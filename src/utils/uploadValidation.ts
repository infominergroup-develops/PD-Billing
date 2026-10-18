// ═══════════════════════════════════════════════════════════════
// UPLOAD VALIDATION — runs before any byte reaches the spreadsheet parser.
// ═══════════════════════════════════════════════════════════════

/** Real MC reports are ~1–2 MB for ~2,500 rows; 20 MB leaves ample headroom. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type Kind = 'xlsx' | 'xls' | 'csv';

const EXT_KIND: Record<string, Kind> = { '.xlsx': 'xlsx', '.xls': 'xls', '.csv': 'csv' };

// Browsers report these (or an empty string) for spreadsheets; anything else is rejected.
const ALLOWED_MIME: Record<Kind, string[]> = {
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
  xls: ['application/vnd.ms-excel', 'application/octet-stream'],
  csv: ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
};

export const ACCEPT_ATTR = '.xlsx,.xls,.csv';

const extOf = (name: string) => {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i).toLowerCase();
};

/** Cheap checks on name, type and size. Returns an error message, or null when acceptable. */
export function validateUploadMeta(file: { name: string; size: number; type: string }): string | null {
  const kind = EXT_KIND[extOf(file.name)];
  if (!kind) return `"${file.name}" is not a supported file. Upload an Excel (.xlsx, .xls) or .csv file.`;
  if (file.size === 0) return 'The file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) {
    return `The file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`;
  }
  if (file.type && !ALLOWED_MIME[kind].includes(file.type)) {
    return `"${file.name}" reports type ${file.type}, which doesn't match a ${kind.toUpperCase()} file.`;
  }
  return null;
}

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v);
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/** Checks the file's leading bytes match its extension (a renamed .exe/.html is rejected). */
export function validateFileSignature(fileName: string, buffer: ArrayBuffer): string | null {
  const kind = EXT_KIND[extOf(fileName)];
  const head = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8192));
  if (kind === 'xlsx' && !startsWith(head, ZIP)) return 'This file is not a valid .xlsx workbook.';
  // Many systems export HTML/XML tables named .xls; SheetJS reads those safely as data, so allow text too.
  if (kind === 'xls' && !startsWith(head, OLE) && !looksLikeText(head)) return 'This file is not a valid .xls workbook.';
  if (kind === 'csv' && (startsWith(head, ZIP) || startsWith(head, OLE) || !looksLikeText(head))) {
    return 'This file is not a plain-text CSV.';
  }
  return null;
}

function looksLikeText(head: Uint8Array): boolean {
  return !head.includes(0); // binary formats contain NUL bytes almost immediately
}
