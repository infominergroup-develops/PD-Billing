import React, { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, ActiveTab } from './components/common/Navbar';
import { LoginPage } from './components/auth/LoginPage';
import { UploadSection } from './components/upload/UploadSection';
import { MasterRateSheet } from './components/rates/MasterRateSheet';
import { ClientMappingSection } from './components/mapping/ClientMappingSection';
import { EditableRecordsTable } from './components/records/EditableRecordsTable';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { InvoiceManager } from './components/invoices/InvoiceManager';
import { EmailDraftingSection } from './components/emails/EmailDraftingSection';
import { ReconciliationSection } from './components/reconciliation/ReconciliationSection';
import { DownloadCenter } from './components/reports/DownloadCenter';
import { AuditLogsViewer } from './components/audit/AuditLogsViewer';
import { DocumentationView } from './components/docs/DocumentationView';
import { InfominerMark } from './components/common/InfominerLogo';

import { useBillingState } from './hooks/useBillingState';

function MainBillingApp() {
  const { isAuthenticated, isCheckingSession } = useAuth();
  
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');

  const {
    rawCases,
    fileName,
    rates,
    clientMap,
    emailContacts,
    setEmailContacts,
    reconciliations,
    auditLogs,
    setAuditLogs,
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
    handleAuditExport,
    handleAddReconciliation,
  } = useBillingState();

  // New tab → start at the top, like a page navigation
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas" aria-busy="true" aria-label="Loading">
        <InfominerMark className="animate-pulse" style={{ height: 40 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setActiveTab('analytics')} />;
  }

  return (
    <div className="min-h-screen bg-canvas text-slate-900 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalBilled={stats.totalBillingAmt}
        totalCases={stats.totalCases}
        exceptionCount={stats.exceptionCases}
        fileName={fileName}
        onLoadSampleData={() => handleLoadSample(() => setActiveTab('analytics'))}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: [0.7, 0, 0.84, 0] } }}
          >
        {activeTab === 'upload' && (
          <UploadSection
            onDataLoaded={(cases, name, cols, summary) =>
              // Stay on the upload tab so the row-count breakdown is visible right away
              handleDataLoaded(cases, name, cols, summary, () => {})
            }
            onClearData={() => handleClearData(() => setActiveTab('upload'))}
            rawCount={rawCases.length}
            stats={stats}
            importSummary={importSummary}
            fileName={fileName}
            onProceedToRates={() => setActiveTab('rates')}
            samplePreviewCases={allCases}
            rawCases={rawCases}
            onRawDataEdit={handleRawDataEdit}
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

        {activeTab === 'emails' && (
          <EmailDraftingSection 
            cases={allCases}
            rates={rates}
            emailContacts={emailContacts}
            onUpdateContact={(updatedContact) => {
              setEmailContacts(prev => {
                const filtered = prev.filter(c => c.clientId !== updatedContact.clientId);
                return [...filtered, updatedContact];
              });
            }}
          />
        )}

        {activeTab === 'reconciliation' && (
          <ReconciliationSection
            cases={allCases}
            reconciliations={reconciliations}
            onAddReconciliation={handleAddReconciliation}
          />
        )}

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
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-200/70 print:hidden">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <InfominerMark style={{ height: 16 }} />
            <span className="font-semibold text-ink-700">Infominer</span>
            <span className="text-slate-300">/</span>
            <span>PD Billing &amp; Audit Platform</span>
          </div>
          <span>Internal build · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    // reducedMotion="user": every motion animation honours the OS "reduce motion" setting
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <MainBillingApp />
      </AuthProvider>
    </MotionConfig>
  );
}
