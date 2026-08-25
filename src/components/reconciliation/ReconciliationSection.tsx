import React, { useState, useMemo } from 'react';
import { ClientReconciliationRecord, CaseRecord } from '../../types';
import { 
  Scale, 
  Calculator, 
  Save, 
  TrendingDown, 
  TrendingUp, 
  Minus,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface ReconciliationSectionProps {
  cases: CaseRecord[];
  reconciliations: ClientReconciliationRecord[];
  onAddReconciliation: (record: ClientReconciliationRecord) => void;
}

export const ReconciliationSection: React.FC<ReconciliationSectionProps> = ({
  cases,
  reconciliations,
  onAddReconciliation
}) => {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [clientCases, setClientCases] = useState<string>('');
  const [clientAmount, setClientAmount] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const billableCases = useMemo(() => cases.filter(c => c.isBillable), [cases]);
  const uniqueClients = Array.from(new Set(billableCases.map(c => c.clientDb).filter(Boolean))).sort();

  // Auto-select first client
  React.useEffect(() => {
    if (!selectedClient && uniqueClients.length > 0) {
      setSelectedClient(uniqueClients[0]);
    }
  }, [uniqueClients, selectedClient]);

  // System calculations for selected client
  const systemData = useMemo(() => {
    const clientSpecific = billableCases.filter(c => c.clientDb === selectedClient);
    return {
      cases: clientSpecific.length,
      amount: clientSpecific.reduce((sum, c) => sum + c.billingAmt, 0)
    };
  }, [billableCases, selectedClient]);

  const clientCasesNum = Number(clientCases) || 0;
  const clientAmountNum = Number(clientAmount) || 0;

  const discrepancyCases = clientCasesNum - systemData.cases;
  const discrepancyAmount = clientAmountNum - systemData.amount;

  const handleSave = () => {
    if (!selectedClient) return;
    
    const record: ClientReconciliationRecord = {
      id: `recon_${Date.now()}`,
      clientId: selectedClient,
      month: selectedMonth,
      systemCases: systemData.cases,
      systemAmount: systemData.amount,
      clientReportedCases: clientCasesNum,
      clientReportedAmount: clientAmountNum,
      discrepancyCases,
      discrepancyAmount,
      remarks: remarks.trim(),
      createdAt: new Date().toISOString(),
      createdBy: 'User' // We don't have user context easily here without useAuth, defaulting to 'User'
    };

    onAddReconciliation(record);
    
    // Reset inputs
    setClientCases('');
    setClientAmount('');
    setRemarks('');
  };

  const renderDiscrepancy = (val: number, isCurrency = false) => {
    const absVal = Math.abs(val);
    const formatted = isCurrency ? `₹${absVal.toLocaleString('en-IN')}` : absVal;
    
    if (val === 0) {
      return (
        <span className="flex items-center gap-1 text-slate-500 font-bold">
          <Minus className="w-4 h-4" /> Matched
        </span>
      );
    }
    if (val > 0) {
      return (
        <span className="flex items-center gap-1 text-emerald-600 font-bold">
          <TrendingUp className="w-4 h-4" /> +{formatted}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-600 font-bold">
        <TrendingDown className="w-4 h-4" /> -{formatted}
      </span>
    );
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-in fade-in duration-200" id="reconciliation-panel">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#2d3e50]">Client Reconciliation &amp; Settlements</h1>
            <p className="text-xs text-slate-500 mt-1">
              Track discrepancies between system-generated billing numbers and client-reported numbers.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calculator className="w-4 h-4 text-[#eb8a23]" />
            <h2 className="font-bold text-sm text-[#2d3e50]">New Reconciliation Record</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Client Institution</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23] bg-white"
              >
                {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Billing Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23]"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">System Cases:</span>
                <span className="font-black text-[#2d3e50]">{systemData.cases}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">System Amount:</span>
                <span className="font-black text-[#2d3e50]">₹{systemData.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Client Reported Cases</label>
                <input
                  type="number"
                  value={clientCases}
                  onChange={(e) => setClientCases(e.target.value)}
                  placeholder="e.g. 90"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Client Reported (₹)</label>
                <input
                  type="number"
                  value={clientAmount}
                  onChange={(e) => setClientAmount(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23]"
                />
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-indigo-800 font-semibold">Case Discrepancy:</span>
                {renderDiscrepancy(discrepancyCases, false)}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-indigo-800 font-semibold">Amount Discrepancy:</span>
                {renderDiscrepancy(discrepancyAmount, true)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Remarks (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Reason for deduction/excess..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23] resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!clientCases && !clientAmount}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#2d3e50] hover:bg-[#1a2530] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#eb8a23]" />
              Save Record
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2d3e50]">Historical Discrepancy Ledger</h3>
            <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">
              {reconciliations.length} Records
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {reconciliations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400">
                <AlertCircle className="w-10 h-10 mb-3 text-slate-200" />
                <p className="text-sm font-medium">No reconciliation records found.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Client</th>
                    <th className="p-3 text-center">System (Cases / ₹)</th>
                    <th className="p-3 text-center">Client (Cases / ₹)</th>
                    <th className="p-3 text-center">Discrepancy (₹)</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reconciliations.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 whitespace-nowrap text-slate-600 font-semibold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {rec.month}
                      </td>
                      <td className="p-3 font-bold text-[#2d3e50] max-w-[140px] truncate" title={rec.clientId}>
                        {rec.clientId}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-500">
                        {rec.systemCases} / ₹{rec.systemAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-700 font-semibold">
                        {rec.clientReportedCases} / ₹{rec.clientReportedAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        {renderDiscrepancy(rec.discrepancyAmount, true)}
                      </td>
                      <td className="p-3 text-slate-500 max-w-[150px] truncate" title={rec.remarks}>
                        {rec.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
