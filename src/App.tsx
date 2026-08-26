import React, { useState } from 'react';
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

import { useBillingState } from './hooks/useBillingState';

function MainBillingApp() {
  const { isAuthenticated } = useAuth();
  
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
        onLoadSampleData={() => handleLoadSample(() => setActiveTab('analytics'))}
      />

      <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'upload' && (
          <UploadSection
            onDataLoaded={(cases, name, cols) => handleDataLoaded(cases, name, cols, () => setActiveTab('analytics'))}
            onClearData={() => handleClearData(() => setActiveTab('upload'))}
            rawCount={rawCases.length}
            uniqueCount={allCases.length}
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
