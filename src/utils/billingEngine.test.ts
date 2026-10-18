import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { RateRule } from '../types';
import { generateSummaryData, lookupRate, migrateLegacyState, parseKM, processCaseRecords, roundMoney } from './billingEngine';
import { detectColumnNames, parseWorkbook, withRowIds } from './excelParser';

const RATES: RateRule[] = [
  { id: 1, client: 'Flat Co', state: '', flat: 500, s1k: null, s1r: null, s2k: null, s2r: null, s3r: null, other: null },
  { id: 2, client: 'Slab Co', state: '', flat: null, s1k: 10, s1r: 300, s2k: 30, s2r: 450, s3r: 700, other: null },
  { id: 3, client: 'Slab Co', state: 'Kerala', flat: null, s1k: 10, s1r: 350, s2k: 30, s2r: 500, s3r: 800, other: null },
];
const MAP = { 'Flat Co': 'Flat Co', 'Slab Co': 'Slab Co' };

const HEADER = ['client_application_number', 'client_name', 'state', 'KM_Running_One_Side', 'case_status', 'deletion_date'];

function rowsFrom(aoa: unknown[][]) {
  const [h, ...body] = aoa as [string[], ...unknown[][]];
  return withRowIds(body.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? null]))));
}

function run(aoa: unknown[][], overrides?: Map<string, { rate: number; reason: string }>) {
  const rows = rowsFrom(aoa);
  return processCaseRecords(rows, detectColumnNames(rows[0]), MAP, RATES, overrides);
}

function assertInvariants(rawCount: number, r: ReturnType<typeof processCaseRecords>) {
  const { stats } = r;
  expect(stats.totalCases).toBe(stats.billableCases + stats.exceptionCases + stats.cancelledCases);
  expect(rawCount).toBe(stats.totalCases + stats.deletedRows);
  expect(stats.totalBillingAmt).toBe(roundMoney(r.billable.reduce((s, c) => s + c.billingAmt, 0)));
  const byClient = stats.topClients.reduce((s, c) => s + c.cases, 0);
  expect(byClient).toBe(stats.totalCases);
}

describe('parseKM', () => {
  it.each([
    [10, 10],
    [0, 0],
    ['1,234', 1234],
    ['12.5 km', 12.5],
    ['₹ 450', 450],
    ['12-15', 12], // previously became 1215
    ['', null],
    [null, null],
    ['abc', null],
    [NaN, null],
  ])('parseKM(%p) → %p', (input, expected) => {
    expect(parseKM(input)).toBe(expected);
  });
});

describe('lookupRate slab boundaries', () => {
  const at = (km: number | string | null, state = '') => lookupRate('Slab Co', state, '', '', '', km, RATES);
  it('applies inclusive upper bounds', () => {
    expect(at(0).rate).toBe(300);
    expect(at(10).rate).toBe(300);
    expect(at(10.01).rate).toBe(450);
    expect(at(30).rate).toBe(450);
    expect(at(31).rate).toBe(700);
  });
  it('uses the state-specific row when the state matches', () => {
    expect(at(5, 'Kerala').rate).toBe(350);
  });
  it('flags missing KM instead of guessing', () => {
    expect(at(null)).toMatchObject({ rate: null, flag: 'KM Not Filled' });
  });
  it('flat rates ignore KM', () => {
    expect(lookupRate('Flat Co', '', '', '', '', null, RATES).rate).toBe(500);
  });
});

describe('processCaseRecords', () => {
  const FIXTURE = [
    HEADER,
    ['A-1', 'Flat Co', 'UP', null, 'Completed', null], // 500
    ['A-1', 'Flat Co', 'UP', null, 'Completed', null], // second activity, same app → 500
    ['B-1', 'Slab Co', 'UP', 8, 'Completed', '-'], // 300 ("-" is not a deletion)
    ['B-2', 'Slab Co', 'UP', '25 km', 'Completed', 'NA'], // 450
    ['B-3', 'Slab Co', 'Kerala', 45, 'Completed', null], // 800
    ['B-4', 'Slab Co', 'UP', null, 'Completed', null], // exception: KM missing
    ['C-1', 'Unknown Ltd', 'UP', 5, 'Completed', null], // exception: client not mapped
    ['D-1', 'Flat Co', 'UP', null, 'PD Cancelled Not To Be Billed', null], // cancelled
    ['E-1', 'Flat Co', 'UP', null, 'Completed', '2026-09-01'], // deleted → excluded
    ['E-2', 'Slab Co', 'UP', 5, 'Completed', '01/09/2026'], // deleted → excluded
  ];

  it('produces exact counts and totals', () => {
    const r = run(FIXTURE);
    expect(r.stats).toMatchObject({
      totalCases: 8,
      deletedRows: 2,
      billableCases: 5,
      exceptionCases: 2,
      cancelledCases: 1,
      totalBillingAmt: 500 + 500 + 300 + 450 + 800,
      avgBillingPerCase: Math.round(2550 / 5),
      uniqueClients: 3,
    });
    expect(r.exceptions.map((c) => c.remarks).sort()).toEqual(['Client not mapped', 'KM Not Filled'].sort());
    assertInvariants(FIXTURE.length - 1, r);
  });

  it('counts every activity row for the same application', () => {
    const r = run(FIXTURE);
    expect(r.allCases.filter((c) => c.clientApplicationNumber === 'A-1')).toHaveLength(2);
  });

  it('applies an override to one row only, even when the application number repeats', () => {
    const base = run(FIXTURE);
    const firstA1 = base.allCases.find((c) => c.clientApplicationNumber === 'A-1')!;
    const r = run(FIXTURE, new Map([[firstA1.rowId, { rate: 999, reason: 'test' }]]));
    const a1 = r.allCases.filter((c) => c.clientApplicationNumber === 'A-1').map((c) => c.billingAmt);
    expect(a1.sort()).toEqual([500, 999]);
    expect(r.stats.totalBillingAmt).toBe(2550 - 500 + 999);
  });

  it('does not drift on fractional rates', () => {
    const rates: RateRule[] = [{ id: 9, client: 'Frac', state: '', flat: 0.1, s1k: null, s1r: null, s2k: null, s2r: null, s3r: null, other: null }];
    const rows = withRowIds(Array.from({ length: 3 }, (_, i) => ({ client_application_number: `F-${i}`, client_name: 'Frac' })));
    const r = processCaseRecords(rows, detectColumnNames(rows[0]), { Frac: 'Frac' }, rates);
    expect(r.stats.totalBillingAmt).toBe(0.3);
  });

  it('summary export grand total matches dashboard total', () => {
    const r = run(FIXTURE);
    const rows = generateSummaryData(r.allCases, 'clientDb', 'Client');
    const grand = rows[rows.length - 1];
    expect(grand['Total Cases']).toBe(r.stats.totalCases);
    expect(grand['Billable Cases']).toBe(r.stats.billableCases);
    expect(grand['Total Billing (₹)']).toBe(r.stats.totalBillingAmt);
  });
});

describe('migrateLegacyState', () => {
  it('re-keys application-number overrides onto every matching row and assigns row ids', () => {
    const legacy = [
      { client_application_number: 'A-1', client_name: 'Flat Co' },
      { client_application_number: 'A-1', client_name: 'Flat Co' },
      { client_application_number: 'B-1', client_name: 'Flat Co' },
    ];
    const cols = detectColumnNames(legacy[0]);
    const out = migrateLegacyState(legacy, { 'A-1': { rate: 1, reason: 'x' } }, cols);
    expect(out.rawCases.map((r) => r._rowId)).toEqual(['r1', 'r2', 'r3']);
    expect(Object.keys(out.overrides).sort()).toEqual(['r1', 'r2']);
  });
});

describe('end to end: .xlsx bytes → billing totals', () => {
  it('matches the hand-computed fixture through the real parser', () => {
    const ws = XLSX.utils.aoa_to_sheet([['MC Report – Sept 2026'], [], ...FIXTURE_WITH_BLANKS]);
    ws['!ref'] = 'A1:F60'; // trailing formatted blank rows
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MC');
    const parsed = parseWorkbook(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));

    expect(parsed.stats.dataRows).toBe(10);
    const r = processCaseRecords(parsed.rows, detectColumnNames(parsed.columns), MAP, RATES);
    expect(r.stats).toMatchObject({ totalCases: 8, deletedRows: 2, billableCases: 5, totalBillingAmt: 2550 });
    assertInvariants(parsed.rows.length, r);
  });

  it('handles 50,000 rows quickly and exactly', () => {
    const aoa: unknown[][] = [HEADER];
    for (let i = 0; i < 50_000; i++) aoa.push([`APP-${i}`, i % 2 ? 'Flat Co' : 'Slab Co', 'UP', i % 40, 'Completed', null]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'MC');
    const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const t0 = performance.now();
    const parsed = parseWorkbook(bytes);
    const r = processCaseRecords(parsed.rows, detectColumnNames(parsed.columns), MAP, RATES);
    const ms = performance.now() - t0;

    // Expected total: 25k flat at 500; slab rows have km = even numbers 0..38 cycling.
    let expected = 25_000 * 500;
    for (let i = 0; i < 50_000; i += 2) {
      const km = i % 40;
      expected += km <= 10 ? 300 : km <= 30 ? 450 : 700;
    }
    expect(r.stats.totalCases).toBe(50_000);
    expect(r.stats.totalBillingAmt).toBe(expected);
    expect(ms).toBeLessThan(15_000);
  }, 30_000);
});

const FIXTURE_WITH_BLANKS: unknown[][] = [
  HEADER,
  ['A-1', 'Flat Co', 'UP', null, 'Completed', null],
  ['A-1', 'Flat Co', 'UP', null, 'Completed', null],
  [null, null, null, null, null, null],
  ['B-1', 'Slab Co', 'UP', 8, 'Completed', '-'],
  ['B-2', 'Slab Co', 'UP', '25 km', 'Completed', 'NA'],
  ['B-3', 'Slab Co', 'Kerala', 45, 'Completed', null],
  ['  ', null, null, null, null, null],
  ['B-4', 'Slab Co', 'UP', null, 'Completed', null],
  ['C-1', 'Unknown Ltd', 'UP', 5, 'Completed', null],
  ['D-1', 'Flat Co', 'UP', null, 'PD Cancelled Not To Be Billed', null],
  ['E-1', 'Flat Co', 'UP', null, 'Completed', '2026-09-01'],
  ['E-2', 'Slab Co', 'UP', 5, 'Completed', '01/09/2026'],
];
