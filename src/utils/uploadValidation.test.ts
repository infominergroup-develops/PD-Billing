import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, validateFileSignature, validateUploadMeta } from './uploadValidation';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0x41)]).buffer;
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

describe('validateUploadMeta', () => {
  it('accepts a normal MC report', () => {
    expect(validateUploadMeta({ name: 'MCReportatActivitylevel.xlsx', size: 1_555_799, type: XLSX_MIME })).toBeNull();
    expect(validateUploadMeta({ name: 'REPORT.XLSX', size: 10, type: '' })).toBeNull(); // case-insensitive; empty type is common
  });
  it.each([
    [{ name: 'report.exe', size: 10, type: '' }, /not a supported/],
    [{ name: 'report.xlsx.html', size: 10, type: 'text/html' }, /not a supported/],
    [{ name: 'report.xlsm', size: 10, type: '' }, /not a supported/],
    [{ name: 'noext', size: 10, type: '' }, /not a supported/],
    [{ name: 'r.xlsx', size: 0, type: XLSX_MIME }, /empty/],
    [{ name: 'r.xlsx', size: MAX_UPLOAD_BYTES + 1, type: XLSX_MIME }, /limit/],
    [{ name: 'r.xlsx', size: 10, type: 'text/html' }, /doesn't match/],
    [{ name: 'r.csv', size: 10, type: 'application/x-msdownload' }, /doesn't match/],
  ])('rejects %o', (file, msg) => {
    expect(validateUploadMeta(file)).toMatch(msg);
  });
});

describe('validateFileSignature', () => {
  it('requires a ZIP container for .xlsx', () => {
    expect(validateFileSignature('a.xlsx', bytes(...ZIP))).toBeNull();
    expect(validateFileSignature('a.xlsx', new TextEncoder().encode('<html><script>').buffer)).toMatch(/not a valid/);
    expect(validateFileSignature('a.xlsx', bytes(0x4d, 0x5a))).toMatch(/not a valid/); // "MZ" = Windows executable
  });
  it('accepts OLE or text-based .xls, rejects other binaries', () => {
    expect(validateFileSignature('a.xls', bytes(...OLE))).toBeNull();
    expect(validateFileSignature('a.xls', new TextEncoder().encode('<table><tr><td>1</td></tr></table>').buffer)).toBeNull();
    expect(validateFileSignature('a.xls', new Uint8Array([0x4d, 0x5a, 0, 0]).buffer)).toMatch(/not a valid/);
  });
  it('requires plain text for .csv', () => {
    expect(validateFileSignature('a.csv', new TextEncoder().encode('a,b\n1,2\n').buffer)).toBeNull();
    expect(validateFileSignature('a.csv', bytes(...ZIP))).toMatch(/plain-text/);
    expect(validateFileSignature('a.csv', new Uint8Array([0x41, 0, 0x42]).buffer)).toMatch(/plain-text/);
  });
});
