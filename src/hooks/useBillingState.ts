import { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

import {
  RateRule,
  CaseRecord,
  ColumnMappingConfig,
  AuditLog,
  Invoice,
  CompanyProfile,
  ClientEmailContact,
  ClientReconciliationRecord,
} from '../types';
import {
  DEFAULT_RATES,
  DEFAULT_MAP,
  DEFAULT_COMPANY_PROFILE,
  SAMPLE_CASES_RAW,
} from '../constants/defaultData';
import {
  processCaseRecords,
  detectColumnNames,
  migrateLegacyState,
} from '../utils/billingEngine';
import { ROW_ID_KEY, withRowIds } from '../utils/excelParser';
import type { ImportSummary } from '../utils/excelParser';
import {
  loadFromPersistentDB,
  saveToPersistentDB,
  clearAllPersistentData,
  createAuditEntry,
} from '../utils/storage';

export function useBillingState() {
  const { user } = useAuth();

  // Core State
  const [rawCases, setRawCases] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState<string>('MC_Report.xlsx');
  const [colConfig, setColConfig] = useState<ColumnMappingConfig>(() =>
    detectColumnNames(SAMPLE_CASES_RAW[0])
  );
  const [rates, setRates] = useState<RateRule[]>(DEFAULT_RATES);
  const [clientMap, setClientMap] = useState<Record<string, string>>(DEFAULT_MAP);
  const [overrides, setOverrides] = useState<Record<string, { rate: number; reason: string }>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reconciliations, setReconciliations] = useState<ClientReconciliationRecord[]>([]);
  const [emailContacts, setEmailContacts] = useState<ClientEmailContact[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isLoadedFromDB, setIsLoadedFromDB] = useState(false);

  // Restore from IndexedDB on initial mount
  useEffect(() => {
    async function restore() {
      const stored = await loadFromPersistentDB();
      if (stored) {
        const storedRows = stored.rawCases || [];
        // Re-detect columns from the data itself: detection is more tolerant than older saves.
        const cols = storedRows.length ? detectColumnNames(storedRows[0]) : stored.colConfig;
        if (cols) setColConfig(cols);
        if (storedRows.length > 0) {
          const migrated = migrateLegacyState(storedRows, stored.overrides || {}, cols!);
          setRawCases(migrated.rawCases);
          setOverrides(migrated.overrides);
          setFileName(stored.fileName || 'Restored_MC_Report.xlsx');
        } else if (stored.overrides) {
          setOverrides(stored.overrides);
        }
        if (stored.importSummary) setImportSummary(stored.importSummary);
        if (stored.rates && stored.rates.length > 0) setRates(stored.rates);
        if (stored.clientMap) setClientMap(stored.clientMap);
        if (stored.invoices) setInvoices(stored.invoices);
        if (stored.reconciliations) setReconciliations(stored.reconciliations);
        if (stored.emailContacts) setEmailContacts(stored.emailContacts);
        if (stored.companyProfile) setCompanyProfile(stored.companyProfile);
        if (stored.auditLogs) setAuditLogs(stored.auditLogs);
      } else {
        // Initial setup demo load
        const demoCols = detectColumnNames(SAMPLE_CASES_RAW[0]);
        setRawCases(withRowIds(SAMPLE_CASES_RAW));
        setFileName('Sample_MC_Verification_2026.xlsx');
        setColConfig(demoCols);
      }
      setIsLoadedFromDB(true);
    }
    restore();
  }, []);

  // Save to persistent storage whenever key entities update
  useEffect(() => {
    if (!isLoadedFromDB) return;
    saveToPersistentDB({
      rawCases,
      colConfig,
      fileName,
      rates,
      clientMap,
      overrides,
      auditLogs,
      invoices,
      reconciliations,
      emailContacts,
      companyProfile,
      importSummary,
    });
  }, [
    importSummary,
    rawCases,
    colConfig,
    fileName,
    rates,
    clientMap,
    overrides,
    auditLogs,
    invoices,
    reconciliations,
    emailContacts,
    companyProfile,
    isLoadedFromDB,
  ]);

  // Central audit logger helper
  const addAuditLog = useCallback(
    (
      action: AuditLog['action'],
      description: string,
      details?: { targetId?: string; oldValue?: string; newValue?: string }
    ) => {
      const entry = createAuditEntry(
        action,
        description,
        { name: user?.name || 'System Admin', role: user?.role || 'admin' },
        details
      );
      setAuditLogs((prev) => [entry, ...prev]);
    },
    [user]
  );

  // Map of overrides for fast calculation lookup
  const overridesMap = useMemo(() => {
    const m = new Map<string, { rate: number; reason: string }>();
    Object.entries(overrides).forEach(([k, v]) => m.set(k, v as { rate: number; reason: string }));
    return m;
  }, [overrides]);

  // Real-time calculation output
  const calculationResult = useMemo(() => {
    return processCaseRecords(rawCases, colConfig, clientMap, rates, overridesMap);
  }, [rawCases, colConfig, clientMap, rates, overridesMap]);

  const { allCases, billable, exceptions, cancelled, stats } = calculationResult;

  // Handlers
  const handleDataLoaded = (
    newRawCases: Record<string, any>[],
    newFileName: string,
    newCols: ColumnMappingConfig,
    summary: ImportSummary | null,
    onSuccess: () => void
  ) => {
    setRawCases(withRowIds(newRawCases));
    setImportSummary(summary);
    setFileName(newFileName);
    setColConfig(newCols);
    setOverrides({}); // Reset overrides for new dataset

    // Detect new clients and populate mapping
    const detectedClients = new Set(
      newRawCases
        .map((r) => (newCols.colClient ? String(r[newCols.colClient] || '').trim() : ''))
        .filter(Boolean)
    );

    setClientMap((prev) => {
      const next = { ...prev };
      detectedClients.forEach((c) => {
        if (!(c in next)) {
          // Attempt automatic match
          const match = rates.find(
            (r) => r.client.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(r.client.toLowerCase())
          );
          next[c] = match ? match.client : '';
        }
      });
      return next;
    });

    addAuditLog(
      'UPLOAD_DATA',
      summary
        ? `Uploaded ${newRawCases.length} rows from ${newFileName} (sheet "${summary.sheetName}", ${summary.blankRows} blank rows skipped)`
        : `Loaded ${newRawCases.length} rows from ${newFileName}`,
      { targetId: newFileName }
    );
    onSuccess();
  };

  const handleClearData = async (onSuccess: () => void) => {
    if (window.confirm('This will clear all stored case records and overrides. Continue?')) {
      setRawCases([]);
      setOverrides({});
      setImportSummary(null);
      setFileName('');
      await clearAllPersistentData();
      addAuditLog('CLEAR_DATA', 'Cleared all case datasets from browser memory');
      onSuccess();
    }
  };

  const handleLoadSample = (onSuccess: () => void) => {
    const demoCols = detectColumnNames(SAMPLE_CASES_RAW[0]);
    handleDataLoaded(SAMPLE_CASES_RAW, 'Sample_MC_Report_2026.xlsx', demoCols, null, onSuccess);
  };

  const handleUpdateRates = (newRates: RateRule[]) => {
    setRates(newRates);
    addAuditLog('UPDATE_RATE_SHEET', `Updated master rate sheet rules (${newRates.length} total rows)`);
  };

  const handleUpdateMapping = (newMap: Record<string, string>) => {
    setClientMap(newMap);
    addAuditLog('UPDATE_MAPPING', 'Updated client name mappings');
  };

  const handleRawDataEdit = (updatedCases: Record<string, any>[]) => {
    setRawCases(updatedCases);
    addAuditLog('UPLOAD_DATA', `Edited raw case data in spreadsheet viewer.`);
  };

  const handleUpdateCase = (updatedCase: CaseRecord, reason?: string) => {
    if (updatedCase.isManualOverride) {
      setOverrides((prev) => ({
        ...prev,
        [updatedCase.rowId]: {
          rate: updatedCase.billingRate,
          reason: reason || updatedCase.overrideReason || 'Manual adjustment',
        },
      }));
    }

    // Persist row-level flags (e.g. leftover) on the raw row itself
    setRawCases((prev) =>
      prev.map((r) => (r[ROW_ID_KEY] === updatedCase.rowId ? { ...r, _isLeftover: updatedCase.isLeftover } : r))
    );

    addAuditLog(
      'OVERRIDE_RATE',
      `Updated case ${updatedCase.clientApplicationNumber} (Rate: ₹${updatedCase.billingRate}) - ${reason || 'Record edit'}`,
      { targetId: updatedCase.clientApplicationNumber, newValue: `₹${updatedCase.billingRate}` }
    );
  };

  const handleAddCase = (newCase: CaseRecord) => {
    const rawObj: Record<string, any> = {
      [ROW_ID_KEY]: newCase.rowId,
      client_application_number: newCase.clientApplicationNumber,
      client_name: newCase.clientDb,
      applicant_name: newCase.applicantName,
      branch_name: newCase.branch,
      city_name: newCase.city,
      state: newCase.state,
      product_name: newCase.product,
      activity_types: newCase.activityType,
      case_status: newCase.caseStatus,
      KM_Running_One_Side: newCase.kmUsedForBilling,
      'KM feeded by MIS': newCase.kmUsedForBilling,
    };

    setRawCases((prev) => [rawObj, ...prev]);

    if (newCase.billingRate > 0) {
      setOverrides((prev) => ({
        ...prev,
        [newCase.rowId]: {
          rate: newCase.billingRate,
          reason: 'Manual Case Creation',
        },
      }));
    }

    addAuditLog('ADD_CASE', `Added new case record ${newCase.clientApplicationNumber} for ${newCase.applicantName}`, {
      targetId: newCase.clientApplicationNumber,
    });
  };

  const handleDeleteCase = (rowId: string) => {
    const target = allCases.find((c) => c.rowId === rowId);
    setRawCases((prev) => prev.filter((r) => r[ROW_ID_KEY] !== rowId));

    setOverrides((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });

    const label = target?.clientApplicationNumber || rowId;
    addAuditLog('DELETE_CASE', `Deleted case record ${label} (row ${rowId})`, { targetId: label });
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev.filter((i) => i.id !== invoice.id)]);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    addAuditLog(
      'GENERATE_INVOICE',
      `Generated Tax Invoice ${invoice.invoiceNumber} for ${invoice.clientName} (₹${invoice.grandTotal.toLocaleString('en-IN')})`,
      { targetId: invoice.invoiceNumber, newValue: `₹${invoice.grandTotal}` }
    );
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
    addAuditLog('GENERATE_INVOICE', `Deleted invoice ${invoiceId}`, { targetId: invoiceId });
  };

  const handleAddReconciliation = (record: ClientReconciliationRecord) => {
    setReconciliations(prev => [record, ...prev]);
    addAuditLog('RECONCILIATION', `Added settlement record for ${record.clientId}`);
  };

  const handleAuditExport = (reportName: string) => {
    confetti({ particleCount: 40, spread: 40, origin: { y: 0.8 } });
    addAuditLog('EXPORT_EXCEL', `Exported report: ${reportName}`);
  };

  return {
    rawCases,
    fileName,
    rates,
    clientMap,
    emailContacts,
    setEmailContacts,
    reconciliations,
    auditLogs,
    setAuditLogs,
    isLoadedFromDB,
    allCases,
    stats,
    importSummary,
    handleDataLoaded,
    handleClearData,
    handleLoadSample,
    handleUpdateRates,
    handleUpdateMapping,
    handleRawDataEdit,
    handleUpdateCase,
    handleAddCase,
    handleDeleteCase,
    handleSaveInvoice,
    handleDeleteInvoice,
    handleAddReconciliation,
    handleAuditExport
  };
}
