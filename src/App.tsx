import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, ActiveTab } from './components/common/Navbar';
import { LoginPage } from './components/auth/LoginPage';
import { UploadSection } from './components/upload/UploadSection';
import { MasterRateSheet } from './components/rates/MasterRateSheet';
import { ClientMappingSection } from './components/mapping/ClientMappingSection';
import { EditableRecordsTable } from './components/records/EditableRecordsTable';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { InvoiceManager } from './components/invoices/InvoiceManager';
import { DownloadCenter } from './components/reports/DownloadCenter';
import { AuditLogsViewer } from './components/audit/AuditLogsViewer';
import { DocumentationView } from './components/docs/DocumentationView';

import {
  RateRule,
  CaseRecord,
  ColumnMappingConfig,
  AuditLog,
  Invoice,
  CompanyProfile,
} from './types';
import {
  DEFAULT_RATES,
  DEFAULT_MAP,
  DEFAULT_COMPANY_PROFILE,
  SAMPLE_CASES_RAW,
} from './constants/defaultData';
import {
  processCaseRecords,
  detectColumnNames,
  deduplicateRawRows,
} from './utils/billingEngine';
import {
  loadFromPersistentDB,
  saveToPersistentDB,
  clearAllPersistentData,
  createAuditEntry,
} from './utils/storage';

function MainBillingApp() {
  const { user, isAuthenticated } = useAuth();

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');

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
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadedFromDB, setIsLoadedFromDB] = useState(false);

  // Restore from IndexedDB on initial mount
  useEffect(() => {
    async function restore() {
      const stored = await loadFromPersistentDB();
      if (stored) {
        if (stored.rawCases && stored.rawCases.length > 0) {
          setRawCases(stored.rawCases);
          setFileName(stored.fileName || 'Restored_MC_Report.xlsx');
          setActiveTab('analytics');
        }
        if (stored.colConfig) setColConfig(stored.colConfig);
        if (stored.rates && stored.rates.length > 0) setRates(stored.rates);
        if (stored.clientMap) setClientMap(stored.clientMap);
        if (stored.overrides) setOverrides(stored.overrides);
        if (stored.invoices) setInvoices(stored.invoices);
        if (stored.companyProfile) setCompanyProfile(stored.companyProfile);
        if (stored.auditLogs) setAuditLogs(stored.auditLogs);
      } else {
        // Initial setup demo load
        const demoCols = detectColumnNames(SAMPLE_CASES_RAW[0]);
        const demoDeduplicated = deduplicateRawRows(SAMPLE_CASES_RAW, demoCols);
        setRawCases(demoDeduplicated);
        setFileName('Sample_MC_Verification_2026.xlsx');
        setColConfig(demoCols);
        setActiveTab('analytics');
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
      companyProfile,
    });
  }, [
    rawCases,
    colConfig,
    fileName,
    rates,
    clientMap,
    overrides,
    auditLogs,
    invoices,
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
    newCols: ColumnMappingConfig
  ) => {
    setRawCases(newRawCases);
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
      `Uploaded and deduplicated ${newRawCases.length} cases from ${newFileName}`,
      { targetId: newFileName }
    );

    setActiveTab('analytics');
  };

  const handleClearData = async () => {
    if (window.confirm('This will clear all stored case records and overrides. Continue?')) {
      setRawCases([]);
      setOverrides({});
      setFileName('');
      await clearAllPersistentData();
      addAuditLog('CLEAR_DATA', 'Cleared all case datasets from browser memory');
      setActiveTab('upload');
    }
  };

  const handleLoadSample = () => {
    const demoCols = detectColumnNames(SAMPLE_CASES_RAW[0]);
    const demoDeduplicated = deduplicateRawRows(SAMPLE_CASES_RAW, demoCols);
    handleDataLoaded(demoDeduplicated, 'Sample_MC_Report_2026.xlsx', demoCols);
  };

  const handleUpdateRates = (newRates: RateRule[]) => {
    setRates(newRates);
    addAuditLog('UPDATE_RATE_SHEET', `Updated master rate sheet rules (${newRates.length} total rows)`);
  };

  const handleUpdateMapping = (newMap: Record<string, string>) => {
    setClientMap(newMap);
    addAuditLog('UPDATE_MAPPING', 'Updated client name mappings');
  };

  const handleUpdateCase = (updatedCase: CaseRecord, reason?: string) => {
    // If rate was manually overridden
    if (updatedCase.isManualOverride) {
      setOverrides((prev) => ({
        ...prev,
        [updatedCase.clientApplicationNumber]: {
          rate: updatedCase.billingRate,
          reason: reason || updatedCase.overrideReason || 'Manual adjustment',
        },
      }));
    }

    addAuditLog(
      'OVERRIDE_RATE',
      `Updated case ${updatedCase.clientApplicationNumber} (Rate: ₹${updatedCase.billingRate}) - ${reason || 'Record edit'}`,
      { targetId: updatedCase.clientApplicationNumber, newValue: `₹${updatedCase.billingRate}` }
    );
  };

  const handleAddCase = (newCase: CaseRecord) => {
    const rawObj: Record<string, any> = {
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
        [newCase.clientApplicationNumber]: {
          rate: newCase.billingRate,
          reason: 'Manual Case Creation',
        },
      }));
    }

    addAuditLog('ADD_CASE', `Added new case record ${newCase.clientApplicationNumber} for ${newCase.applicantName}`, {
      targetId: newCase.clientApplicationNumber,
    });
  };

  const handleDeleteCase = (clientApplicationNumber: string) => {
    setRawCases((prev) =>
      prev.filter((r) => {
        const idVal = colConfig.colClientApplicationNumber ? r[colConfig.colClientApplicationNumber] : null;
        return String(idVal).trim() !== String(clientApplicationNumber).trim();
      })
    );

    setOverrides((prev) => {
      const next = { ...prev };
      delete next[clientApplicationNumber];
      return next;
    });

    addAuditLog('DELETE_CASE', `Deleted case record ${clientApplicationNumber}`, { targetId: clientApplicationNumber });
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

  const handleAuditExport = (reportName: string) => {
    confetti({ particleCount: 40, spread: 40, origin: { y: 0.8 } });
    addAuditLog('EXPORT_EXCEL', `Exported report: ${reportName}`);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setActiveTab('analytics')} />;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col font-sans selection:bg-[#eb8a23]/20 selection:text-[#2d3e50]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalBilled={stats.totalBillingAmt}
        totalCases={stats.totalCases}
        exceptionCount={stats.exceptionCases}
        fileName={fileName}
        onLoadSampleData={handleLoadSample}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'upload' && (
          <UploadSection
            onDataLoaded={handleDataLoaded}
            onClearData={handleClearData}
            rawCount={rawCases.length}
            uniqueCount={allCases.length}
            fileName={fileName}
            onProceedToRates={() => setActiveTab('rates')}
            samplePreviewCases={allCases}
          />
        )}

        {activeTab === 'rates' && (
          <MasterRateSheet
            rates={rates}
            onUpdateRates={handleUpdateRates}
            onProceedToMapping={() => setActiveTab('mapping')}
          />
        )}

        {activeTab === 'mapping' && (
          <ClientMappingSection
            allCases={allCases}
            rates={rates}
            clientMap={clientMap}
            onUpdateMapping={handleUpdateMapping}
            onProceedToProcess={() => setActiveTab('analytics')}
          />
        )}

        {activeTab === 'records' && (
          <EditableRecordsTable
            cases={allCases}
            rates={rates}
            onUpdateCase={handleUpdateCase}
            onAddCase={handleAddCase}
            onDeleteCase={handleDeleteCase}
            onExportFilteredExcel={(filteredCases) => {
              handleAuditExport(`Filtered_View_${filteredCases.length}_Cases`);
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            stats={stats}
            allCases={allCases}
            onNavigateTab={setActiveTab}
            onFilterClient={(client) => {
              setActiveTab('records');
            }}
          />
        )}

        {/* activeTab === 'invoices' && (
          <InvoiceManager
            cases={allCases}
            invoices={invoices}
            companyProfile={companyProfile}
            onSaveInvoice={handleSaveInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onUpdateCompanyProfile={setCompanyProfile}
          />
        ) */}

        {activeTab === 'reports' && (
          <DownloadCenter
            cases={allCases}
            rates={rates}
            onAuditExport={handleAuditExport}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogsViewer
            logs={auditLogs}
            onClearLogs={() => setAuditLogs([])}
          />
        )}

        {activeTab === 'docs' && <DocumentationView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#2d3e50]">Infominer Verification &amp; Analytics</span>
          <span>•</span>
          <span>Enterprise PD Billing Automation Platform</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Internal Secure Build • Version 2026.4
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainBillingApp />
    </AuthProvider>
  );
}
