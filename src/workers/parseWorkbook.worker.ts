/// <reference lib="webworker" />
import { parseWorkbook, ParseOptions, ParsedWorkbook } from '../utils/excelParser';

export type ParseRequest = { buffer: ArrayBuffer; options: ParseOptions };
export type ParseResponse = { ok: true; result: ParsedWorkbook } | { ok: false; error: string };

self.onmessage = (e: MessageEvent<ParseRequest>) => {
  let response: ParseResponse;
  try {
    response = { ok: true, result: parseWorkbook(e.data.buffer, e.data.options) };
  } catch (err: any) {
    response = { ok: false, error: err?.message || 'Unrecognised file format' };
  }
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(response);
};
