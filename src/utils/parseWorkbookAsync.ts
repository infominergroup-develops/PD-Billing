import type { ParseOptions, ParsedWorkbook } from './excelParser';
import type { ParseResponse } from '../workers/parseWorkbook.worker';

/**
 * Parse a workbook off the main thread so large files don't freeze the UI.
 * The buffer is copied (not transferred) so the caller can re-parse another sheet.
 */
export function parseWorkbookAsync(buffer: ArrayBuffer, options: ParseOptions = {}): Promise<ParsedWorkbook> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/parseWorkbook.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<ParseResponse>) => {
      worker.terminate();
      const res = e.data;
      if ('result' in res) resolve(res.result);
      else reject(new Error(res.error));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'The file could not be parsed.'));
    };
    worker.postMessage({ buffer, options });
  });
}
