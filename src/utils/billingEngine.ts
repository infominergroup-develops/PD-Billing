import * as XLSX from 'xlsx';
import { RateRule, CaseRecord, ColumnMappingConfig, DashboardStats } from '../types';

export function norm(s: string | null | undefined): string {
  return String(s || '').trim().toLowerCase();
}

export function parseKM(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

export function detectColumnNames(sampleRow: Record<string, any>): ColumnMappingConfig {
  const sampleKeys = Object.keys(sampleRow);
  const keyMap: Record<string, string> = {};
  sampleKeys.forEach((k) => {
    keyMap[k.toLowerCase().replace(/[\s_]/g, '')] = k;
  });

  return {
    colClientApplicationNumber: keyMap['clientapplicationnumber'] || keyMap['applicationnumber'] || keyMap['appno'] || keyMap['caseid'] || keyMap['caseno'] || keyMap['id'] || null,
    colClient: keyMap['clientname'] || keyMap['client_name'] || keyMap['client'] || null,
    colKM: keyMap['kmrunningoneside'] || keyMap['km_running_one_side'] || keyMap['kmoneside'] || keyMap['km'] || null,
    colKMFed: keyMap['kmfeededbymis'] || keyMap['km_feeded_by_mis'] || null,
    colKMUsed: keyMap['kmusedforbilling'] || keyMap['kmused'] || keyMap['billingkm'] || null,
    colStatus: keyMap['casestatus'] || keyMap['case_status'] || keyMap['status'] || null,
    colCity: keyMap['cityname'] || keyMap['city_name'] || keyMap['city'] || null,
    colState: keyMap['state'] || keyMap['statename'] || keyMap['state_name'] || null,
    colProduct: keyMap['productname'] || keyMap['product_name'] || keyMap['product'] || null,
    colActivity: keyMap['activitytypes'] || keyMap['activity_types'] || keyMap['activitytype'] || null,
    colApplicant: keyMap['applicantname'] || keyMap['applicant_name'] || keyMap['applicant'] || null,
    colAppNo: keyMap['clientapplicationnumber'] || keyMap['client_application_number'] || keyMap['appno'] || null,
    colVerifier: keyMap['verifiername'] || keyMap['verifier_name'] || keyMap['verifier'] || null,
    colRecDate: keyMap['casereceiveddate'] || keyMap['case_received_date'] || keyMap['receiveddate'] || null,
    colApptDate: keyMap['appointmentdate'] || keyMap['appointment_date'] || null,
    colCloseDate: keyMap['casecloseddate'] || keyMap['case_closed_date'] || keyMap['closeddate'] || null,
    colTAT: keyMap['tatreceiveddays'] || keyMap['tat_received_days'] || keyMap['tat'] || null,
    colFinalSt: keyMap['finalstatus'] || keyMap['final_status'] || null,
    colLoanAmt: keyMap['appliedloanamt'] || keyMap['applied_loan_amt'] || keyMap['loanamount'] || null,
    colBranch: keyMap['branchname'] || keyMap['branch_name'] || keyMap['branch'] || null,
    colActivityNm: keyMap['activityname'] || keyMap['activity_name'] || null,
  };
}

export function deduplicateRawRows(
  rows: Record<string, any>[],
  cols: ColumnMappingConfig
): Record<string, any>[] {
  // To ensure all rows from Excel are accurately read without dropping any
  // cases (even if Client Application Number is repeated), we skip deduplication
  return rows.map((r, idx) => ({ ...r, _rawRowIdx: idx }));
}

export function lookupRate(
  masterClient: string,
  state: string,
  kmVal: any,
  rates: RateRule[]
): { rate: number | null; flag: string; slab: string } {
  if (!masterClient || !masterClient.trim()) {
    return { rate: null, flag: 'Client not mapped', slab: '' };
  }

  const cRates = rates.filter((r) => norm(r.client) === norm(masterClient));
  if (!cRates.length) {
    return { rate: null, flag: 'Client not in rate sheet', slab: '' };
  }

  // State-specific match first, then blank-state fallback
  let row: RateRule | undefined;
  if (state && state.trim()) {
    row = cRates.find((r) => r.state && norm(state).includes(norm(r.state)));
  }
  if (!row) {
    row = cRates.find((r) => !r.state || !r.state.trim());
  }
  if (!row) {
    row = cRates[0];
  }

  // Flat rate check
  if (row.flat !== null && row.flat !== undefined && !isNaN(Number(row.flat))) {
    return { rate: Number(row.flat), flag: '', slab: 'Flat Rate' };
  }

  // KM-based calculation
  const km = parseKM(kmVal);
  if (km === null) {
    return { rate: null, flag: 'KM Not Filled', slab: '' };
  }

  if (row.s1k !== null && row.s1k !== undefined && km <= row.s1k) {
    return { rate: Number(row.s1r || 0), flag: '', slab: `0–${row.s1k} km` };
  }

  if (row.s2k !== null && row.s2k !== undefined && km <= row.s2k) {
    return { rate: Number(row.s2r || 0), flag: '', slab: `${row.s1k ?? 0}–${row.s2k} km` };
  }

  // Beyond slab 2
  const beyondRate = row.s3r ?? row.s2r ?? row.s1r;
  if (beyondRate !== null && beyondRate !== undefined) {
    return { rate: Number(beyondRate), flag: '', slab: `>${row.s2k ?? row.s1k ?? 0} km` };
  }

  return { rate: null, flag: 'Rate not configured in Master Sheet', slab: '' };
}

export function processCaseRecords(
  rawCases: Record<string, any>[],
  cols: ColumnMappingConfig,
  clientMap: Record<string, string>,
  rates: RateRule[],
  existingOverrides?: Map<string, { rate: number; reason: string }>
): {
  allCases: CaseRecord[];
  billable: CaseRecord[];
  exceptions: CaseRecord[];
  cancelled: CaseRecord[];
  stats: DashboardStats;
} {
  const allCases: CaseRecord[] = [];
  const billable: CaseRecord[] = [];
  const exceptions: CaseRecord[] = [];
  const cancelled: CaseRecord[] = [];

  const getCol = (r: Record<string, any>, col: string | null) => (col && r[col] !== undefined ? r[col] : null);

  rawCases.forEach((r, idx) => {
    const rawCaseId = getCol(r, cols.colClientApplicationNumber);
    const clientApplicationNumber = rawCaseId !== null && rawCaseId !== undefined && String(rawCaseId).trim() !== ''
      ? String(rawCaseId).trim()
      : `CASE-${idx + 1}`;

    const clientDb = String(getCol(r, cols.colClient) || '').trim();
    const rateSheetClient = clientMap[clientDb] || '';
    const state = String(getCol(r, cols.colState) || '').trim();
    const status = String(getCol(r, cols.colStatus) || '').trim();

    // Priority KM calculation: KM Used for Billing -> KM feeded by MIS -> KM_Running_One_Side
    const kmFed = parseKM(getCol(r, cols.colKMFed));
    const kmOne = parseKM(getCol(r, cols.colKM));
    const kmUsed = parseKM(getCol(r, cols.colKMUsed));
    const kmFinal = kmUsed !== null ? kmUsed : kmFed !== null ? kmFed : kmOne;

    const isPDNotBilled = norm(status).includes('cancelled not to be billed') || norm(status) === 'pd cancelled not to be billed';

    let billingRate = 0;
    let slabApplied = '';
    let remarks = '';
    let isBillable = false;
    let isException = false;
    let isCancelled = false;
    let isManualOverride = false;
    let overrideReason = '';

    const override = existingOverrides?.get(clientApplicationNumber);

    if (override) {
      billingRate = override.rate;
      isManualOverride = true;
      overrideReason = override.reason;
      slabApplied = 'Manual Override';
      remarks = `Overridden: ${override.reason}`;
      isBillable = billingRate > 0;
      isException = billingRate === 0;
    } else if (isPDNotBilled) {
      billingRate = 0;
      slabApplied = 'Cancelled';
      remarks = 'Cancelled – Not Billed';
      isCancelled = true;
    } else {
      const lookup = lookupRate(rateSheetClient, state, kmFinal, rates);
      if (lookup.rate !== null && lookup.rate > 0) {
        billingRate = lookup.rate;
        slabApplied = lookup.slab;
        remarks = lookup.flag;
        isBillable = true;
      } else {
        billingRate = 0;
        slabApplied = lookup.slab;
        remarks = lookup.flag || 'Exception: Missing rate or KM';
        isException = true;
      }
    }

    const record: CaseRecord = {
      id: `case_${clientApplicationNumber}_${idx}`,
      clientApplicationNumber,
      clientAppNo: String(getCol(r, cols.colAppNo) || ''),
      applicantName: String(getCol(r, cols.colApplicant) || 'Unnamed Applicant'),
      clientDb: clientDb || 'Unknown Client',
      rateSheetClient,
      branch: String(getCol(r, cols.colBranch) || 'Main Branch'),
      city: String(getCol(r, cols.colCity) || ''),
      state: state || 'Other',
      product: String(getCol(r, cols.colProduct) || 'Verification'),
      activityType: String(getCol(r, cols.colActivity) || 'PD'),
      activityName: String(getCol(r, cols.colActivityNm) || ''),
      caseReceivedDate: String(getCol(r, cols.colRecDate) || ''),
      appointmentDate: String(getCol(r, cols.colApptDate) || ''),
      caseClosedDate: String(getCol(r, cols.colCloseDate) || ''),
      tatReceivedDays: getCol(r, cols.colTAT) ?? '',
      finalStatus: String(getCol(r, cols.colFinalSt) || ''),
      caseStatus: status || (isBillable ? 'Completed' : 'Pending'),
      verifierName: String(getCol(r, cols.colVerifier) || ''),
      kmFeededByMis: kmFed,
      kmOneSide: kmOne,
      kmUsedForBilling: kmFinal,
      appliedLoanAmt: parseKM(getCol(r, cols.colLoanAmt)),
      billingRate,
      billingAmt: billingRate,
      slabApplied,
      remarks,
      isManualOverride,
      overrideReason,
      isBillable,
      isException,
      isCancelled,
      _rawRow: r,
    };

    allCases.push(record);
    if (isCancelled) {
      cancelled.push(record);
    } else if (isBillable) {
      billable.push(record);
    } else {
      exceptions.push(record);
    }
  });

  // Calculate Dashboard Statistics
  const totalBillingAmt = billable.reduce((sum, c) => sum + c.billingAmt, 0);
  const avgBillingPerCase = billable.length ? Math.round(totalBillingAmt / billable.length) : 0;

  // Group by client
  const clientAgg: Record<string, { cases: number; amount: number }> = {};
  billable.forEach((c) => {
    const k = c.clientDb || 'Unknown';
    if (!clientAgg[k]) clientAgg[k] = { cases: 0, amount: 0 };
    clientAgg[k].cases += 1;
    clientAgg[k].amount += c.billingAmt;
  });
  const topClients = Object.entries(clientAgg)
    .map(([name, data]) => ({ name, cases: data.cases, amount: data.amount }))
    .sort((a, b) => b.amount - a.amount);

  // Group by state
  const stateAgg: Record<string, { count: number; amount: number }> = {};
  billable.forEach((c) => {
    const k = c.state || 'Unassigned';
    if (!stateAgg[k]) stateAgg[k] = { count: 0, amount: 0 };
    stateAgg[k].count += 1;
    stateAgg[k].amount += c.billingAmt;
  });
  const stateBreakdown = Object.entries(stateAgg)
    .map(([state, data]) => ({ state, count: data.count, amount: data.amount }))
    .sort((a, b) => b.amount - a.amount);

  // Group by product
  const prodAgg: Record<string, { count: number; amount: number }> = {};
  billable.forEach((c) => {
    const k = c.product || 'Other';
    if (!prodAgg[k]) prodAgg[k] = { count: 0, amount: 0 };
    prodAgg[k].count += 1;
    prodAgg[k].amount += c.billingAmt;
  });
  const productBreakdown = Object.entries(prodAgg)
    .map(([product, data]) => ({ product, count: data.count, amount: data.amount }))
    .sort((a, b) => b.amount - a.amount);

  // Group by slab
  const slabAgg: Record<string, { count: number; amount: number }> = {};
  billable.forEach((c) => {
    const k = c.slabApplied || 'Standard';
    if (!slabAgg[k]) slabAgg[k] = { count: 0, amount: 0 };
    slabAgg[k].count += 1;
    slabAgg[k].amount += c.billingAmt;
  });
  const slabBreakdown = Object.entries(slabAgg)
    .map(([slab, data]) => ({ slab, count: data.count, amount: data.amount }))
    .sort((a, b) => b.amount - a.amount);

  // Status breakdown
  const statusAgg: Record<string, number> = {
    Billable: billable.length,
    Exceptions: exceptions.length,
    Cancelled: cancelled.length,
  };
  const statusBreakdown = Object.entries(statusAgg).map(([status, count]) => ({ status, count }));

  const uniqueClients = new Set(allCases.map((c) => c.clientDb).filter(Boolean)).size;

  const stats: DashboardStats = {
    totalCases: allCases.length,
    billableCases: billable.length,
    totalBillingAmt,
    exceptionCases: exceptions.length,
    cancelledCases: cancelled.length,
    uniqueClients,
    avgBillingPerCase,
    topClients,
    stateBreakdown,
    productBreakdown,
    statusBreakdown,
    slabBreakdown,
  };

  return {
    allCases,
    billable,
    exceptions,
    cancelled,
    stats,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXCEL EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════
function sanitizeSheetName(name: string): string {
  return String(name || 'Sheet')
    .replace(/[:\\/?*[\]]/g, '')
    .substring(0, 31);
}

function createSheetFromObjects(data: Record<string, any>[]): XLSX.WorkSheet {
  if (!data || !data.length) {
    return XLSX.utils.aoa_to_sheet([['No data available']]);
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0]);
  ws['!cols'] = keys.map((k) => ({
    wch: Math.min(Math.max(k.length + 3, 14), 45),
  }));
  return ws;
}

export function formatCaseForExport(c: CaseRecord) {
  return {
    'Client Application Number': c.clientApplicationNumber,
    'Client Application No.': c.clientAppNo,
    'Applicant Name': c.applicantName,
    'Client (DB)': c.clientDb,
    'Rate Sheet Client': c.rateSheetClient,
    Branch: c.branch,
    City: c.city,
    State: c.state,
    Product: c.product,
    'Activity Type': c.activityType,
    'Case Received Date': c.caseReceivedDate || '',
    'Appointment Date': c.appointmentDate || '',
    'Case Closed Date': c.caseClosedDate || '',
    'TAT (Days)': c.tatReceivedDays,
    'Case Status': c.caseStatus,
    'Verifier Name': c.verifierName || '',
    'KM Feeded by MIS': c.kmFeededByMis ?? '',
    'KM One Side': c.kmOneSide ?? '',
    'KM Used for Billing': c.kmUsedForBilling ?? '',
    'Billing Rate (₹)': c.billingRate,
    'Billing Amt (₹)': c.billingAmt,
    'Slab Applied': c.slabApplied,
    Remarks: c.remarks,
    'Manual Override': c.isManualOverride ? 'Yes' : 'No',
    'Override Reason': c.overrideReason || '',
  };
}

export function generateRateAnnexureData(rates: RateRule[], clientFilter?: string) {
  const src = clientFilter
    ? rates.filter((r) => norm(r.client) === norm(clientFilter))
    : rates;

  return src.map((r) => ({
    'Client Name': r.client,
    State: r.state || 'All States',
    'Rate Type': r.flat !== null && r.flat !== undefined ? 'Flat Rate' : 'KM Slab',
    'Flat Rate (₹)': r.flat ?? '',
    'Slab 1 (Max KM)': r.s1k ? `0 – ${r.s1k} km` : '',
    'Slab 1 Rate (₹)': r.s1r ?? '',
    'Slab 2 (Max KM)': r.s2k ? `${r.s1k ?? 0} – ${r.s2k} km` : '',
    'Slab 2 Rate (₹)': r.s2r ?? '',
    'Beyond Slab 2 Rate (₹)': r.s3r ?? (r.s2k ? r.s2r : '') ?? '',
    'Site/Other Visit Rate (₹)': r.other ?? '',
  }));
}

export function generateSummaryData(
  allCases: CaseRecord[],
  groupKey: keyof CaseRecord,
  groupLabel: string
) {
  const grp: Record<string, { total: number; billable: number; exceptions: number; cancelled: number; amount: number }> = {};

  allCases.forEach((c) => {
    const k = String(c[groupKey] || 'Unknown');
    if (!grp[k]) {
      grp[k] = { total: 0, billable: 0, exceptions: 0, cancelled: 0, amount: 0 };
    }
    grp[k].total += 1;
    if (c.isCancelled) {
      grp[k].cancelled += 1;
    } else if (c.isBillable) {
      grp[k].billable += 1;
      grp[k].amount += c.billingAmt;
    } else {
      grp[k].exceptions += 1;
    }
  });

  const rows = Object.entries(grp)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([k, v]) => ({
      [groupLabel]: k,
      'Total Cases': v.total,
      'Billable Cases': v.billable,
      Exceptions: v.exceptions,
      'Cancelled / Not Billed': v.cancelled,
      'Total Billing (₹)': v.amount,
      'Avg Rate (₹)': v.billable ? Math.round(v.amount / v.billable) : 0,
    }));

  const grandTotal = rows.reduce((s, r) => s + (r['Total Billing (₹)'] as number), 0);
  const grandBillable = rows.reduce((s, r) => s + (r['Billable Cases'] as number), 0);
  const grandExceptions = rows.reduce((s, r) => s + (r['Exceptions'] as number), 0);
  const grandCancelled = rows.reduce((s, r) => s + (r['Cancelled / Not Billed'] as number), 0);

  rows.push({
    [groupLabel]: '── GRAND TOTAL ──',
    'Total Cases': allCases.length,
    'Billable Cases': grandBillable,
    Exceptions: grandExceptions,
    'Cancelled / Not Billed': grandCancelled,
    'Total Billing (₹)': grandTotal,
    'Avg Rate (₹)': grandBillable ? Math.round(grandTotal / grandBillable) : 0,
  });

  return rows;
}

export function exportBillingReport(
  type: 'client' | 'state' | 'product' | 'all' | 'exceptions',
  allCases: CaseRecord[],
  rates: RateRule[],
  fileNamePrefix: string = 'Infominer_PD_Billing'
) {
  const wb = XLSX.utils.book_new();
  const billable = allCases.filter((c) => c.isBillable);
  const exceptions = allCases.filter((c) => c.isException);
  const cancelled = allCases.filter((c) => c.isCancelled);

  if (type === 'exceptions') {
    const exData = exceptions.map(formatCaseForExport);
    const cancData = cancelled.map(formatCaseForExport);
    XLSX.utils.book_append_sheet(
      wb,
      createSheetFromObjects(exData.length ? exData : [{ info: 'No exception cases' }]),
      'Exceptions'
    );
    XLSX.utils.book_append_sheet(
      wb,
      createSheetFromObjects(cancData.length ? cancData : [{ info: 'No cancelled cases' }]),
      'Cancelled'
    );
    XLSX.writeFile(wb, `${fileNamePrefix}_Exceptions_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return;
  }

  // 1. Summary Sheet
  let groupKey: keyof CaseRecord = 'clientDb';
  let groupLabel = 'Client Name';
  if (type === 'state') {
    groupKey = 'state';
    groupLabel = 'State';
  } else if (type === 'product') {
    groupKey = 'product';
    groupLabel = 'Product';
  }

  const summaryRows = generateSummaryData(allCases, groupKey, groupLabel);
  XLSX.utils.book_append_sheet(wb, createSheetFromObjects(summaryRows), 'Summary');

  // 2. Rate Annexure Sheet
  const rateData = generateRateAnnexureData(rates);
  XLSX.utils.book_append_sheet(wb, createSheetFromObjects(rateData), 'Rate Annexure');

  if (type === 'all') {
    const billableData = billable.map(formatCaseForExport);
    XLSX.utils.book_append_sheet(
      wb,
      createSheetFromObjects(billableData.length ? billableData : [{ info: 'No billable cases' }]),
      'All Billable Cases'
    );
  } else {
    // Group sheets
    const groups: Record<string, CaseRecord[]> = {};
    billable.forEach((c) => {
      const k = String(c[groupKey] || 'Other');
      if (!groups[k]) groups[k] = [];
      groups[k].push(c);
    });

    Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([groupName, cases]) => {
        const sheetData = cases.map(formatCaseForExport);
        XLSX.utils.book_append_sheet(wb, createSheetFromObjects(sheetData), sanitizeSheetName(groupName));
      });
  }

  // 4. Append Exceptions and Cancelled
  if (exceptions.length) {
    XLSX.utils.book_append_sheet(wb, createSheetFromObjects(exceptions.map(formatCaseForExport)), 'Exceptions');
  }
  if (cancelled.length) {
    XLSX.utils.book_append_sheet(wb, createSheetFromObjects(cancelled.map(formatCaseForExport)), 'Cancelled');
  }

  const typeLabels = {
    client: 'Client_Wise',
    state: 'State_Wise',
    product: 'Product_Wise',
    all: 'Full_Consolidated',
  };

  XLSX.writeFile(wb, `${fileNamePrefix}_${typeLabels[type] || 'Report'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportSingleClientReport(
  clientName: string,
  clientCases: CaseRecord[],
  rates: RateRule[],
  groupBy: 'branch' | 'product' | 'all' = 'branch'
) {
  const wb = XLSX.utils.book_new();
  const billable = clientCases.filter((c) => c.isBillable);
  const exceptions = clientCases.filter((c) => c.isException);
  const cancelled = clientCases.filter((c) => c.isCancelled);

  const rateSheetClient = clientCases[0]?.rateSheetClient || clientName;

  // 1. Summary
  const gk: keyof CaseRecord = groupBy === 'product' ? 'product' : 'branch';
  const gl = groupBy === 'product' ? 'Product' : 'Branch';
  const summaryRows = generateSummaryData(clientCases, gk, gl);
  XLSX.utils.book_append_sheet(wb, createSheetFromObjects(summaryRows), 'Summary');

  // 2. Rate Annexure for this client
  const annexure = generateRateAnnexureData(rates, rateSheetClient);
  XLSX.utils.book_append_sheet(wb, createSheetFromObjects(annexure), 'Rate Annexure');

  if (groupBy === 'all') {
    const billableData = billable.map(formatCaseForExport);
    XLSX.utils.book_append_sheet(
      wb,
      createSheetFromObjects(billableData.length ? billableData : [{ info: 'No billable cases' }]),
      'Billable Cases'
    );
  } else {
    const groups: Record<string, CaseRecord[]> = {};
    billable.forEach((c) => {
      const k = String(c[gk] || 'Main');
      if (!groups[k]) groups[k] = [];
      groups[k].push(c);
    });

    Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([k, rows]) => {
        XLSX.utils.book_append_sheet(wb, createSheetFromObjects(rows.map(formatCaseForExport)), sanitizeSheetName(k));
      });
  }

  if (exceptions.length) {
    XLSX.utils.book_append_sheet(wb, createSheetFromObjects(exceptions.map(formatCaseForExport)), 'Exceptions');
  }
  if (cancelled.length) {
    XLSX.utils.book_append_sheet(wb, createSheetFromObjects(cancelled.map(formatCaseForExport)), 'Cancelled');
  }

  XLSX.writeFile(wb, `${sanitizeSheetName(clientName)}_${groupBy.toUpperCase()}_Billing_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
