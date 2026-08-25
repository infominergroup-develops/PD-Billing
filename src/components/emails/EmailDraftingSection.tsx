import React, { useState, useMemo, useEffect } from 'react';
import { Mail, Send, Copy, CheckCircle2, Save, Download, FileSpreadsheet, Paperclip } from 'lucide-react';
import { CaseRecord, ClientEmailContact, RateRule } from '../../types';
import { exportSingleClientReport } from '../../utils/billingEngine';

interface EmailDraftingSectionProps {
  cases: CaseRecord[];
  rates: RateRule[];
  emailContacts: ClientEmailContact[];
  onUpdateContact: (contact: ClientEmailContact) => void;
}

export const EmailDraftingSection: React.FC<EmailDraftingSectionProps> = ({
  cases,
  rates,
  emailContacts,
  onUpdateContact
}) => {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [breakdownLevel, setBreakdownLevel] = useState<'none' | 'product' | 'branch' | 'state' | 'city'>('none');
  const [localContact, setLocalContact] = useState({ toEmail: '', ccEmail: '' });
  const [isSaved, setIsSaved] = useState(false);

  const billableCases = useMemo(() => cases.filter((c) => c.isBillable), [cases]);

  // Group by client
  const clientGroups = useMemo(() => {
    const groups: Record<string, CaseRecord[]> = {};
    billableCases.forEach((c) => {
      const k = c.clientDb || 'Unknown Client';
      if (!groups[k]) groups[k] = [];
      groups[k].push(c);
    });
    return groups;
  }, [billableCases]);

  const clients = Object.keys(clientGroups).sort();

  // Auto-select first client if none selected
  React.useEffect(() => {
    if (!selectedClient && clients.length > 0) {
      setSelectedClient(clients[0]);
    }
  }, [clients, selectedClient]);

  const currentCases = selectedClient ? clientGroups[selectedClient] || [] : [];
  const currentContact = emailContacts.find(c => c.clientId === selectedClient) || {
    clientId: selectedClient,
    toEmail: '',
    ccEmail: ''
  };

  useEffect(() => {
    setLocalContact({ toEmail: currentContact.toEmail, ccEmail: currentContact.ccEmail });
    setIsSaved(false);
  }, [selectedClient, currentContact.toEmail, currentContact.ccEmail]);

  const totalAmount = currentCases.reduce((sum, c) => sum + c.billingAmt, 0);

  // Generate Breakdown Text
  const breakdownText = useMemo(() => {
    if (breakdownLevel === 'none') return '';
    const groups: Record<string, { count: number; amount: number }> = {};
    currentCases.forEach(c => {
      const key = String(c[breakdownLevel] || 'Unknown');
      if (!groups[key]) groups[key] = { count: 0, amount: 0 };
      groups[key].count += 1;
      groups[key].amount += c.billingAmt;
    });

    const lines = Object.entries(groups)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([k, v]) => `  - ${k}: ${v.count} cases (₹${v.amount.toLocaleString('en-IN')})`);
    
    return `\nBreakdown by ${breakdownLevel.charAt(0).toUpperCase() + breakdownLevel.slice(1)}:\n${lines.join('\n')}`;
  }, [breakdownLevel, currentCases]);

  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const breakdownSuffix = breakdownLevel !== 'none' 
    ? `_${breakdownLevel.charAt(0).toUpperCase() + breakdownLevel.slice(1)}_Wise` 
    : '_Client_Wise';
    
  const emailSubject = `Draft_${selectedClient}_${currentMonth}_${currentYear}${breakdownSuffix}`;
  const emailBody = `Dear Team,

Please find the billing details for the recent PD verification activities.

Summary:
- Client: ${selectedClient}
- Total Cases Processed: ${currentCases.length}
- Total Billing Amount: ₹${totalAmount.toLocaleString('en-IN')}${breakdownText}

A detailed Excel annexure and the system-generated invoice are attached for your reference. 
Please review and process the invoice at your earliest convenience.

Best Regards,
Infominer PD Audit Team`;

  const handleSaveContacts = () => {
    onUpdateContact({ 
      clientId: selectedClient, 
      toEmail: localContact.toEmail, 
      ccEmail: localContact.ccEmail 
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDraftEmail = () => {
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailBody);
    const mailto = `mailto:${localContact.toEmail}?cc=${localContact.ccEmail}&subject=${subject}&body=${body}`;
    window.location.href = mailto;
  };

  const handleDownloadAttachment = () => {
    if (!selectedClient || currentCases.length === 0) return;
    const exportGroup = breakdownLevel === 'none' ? 'all' : breakdownLevel as 'branch' | 'product' | 'state' | 'city' | 'all';
    exportSingleClientReport(selectedClient, currentCases, rates, exportGroup);
  };

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
        <Mail className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-[#2d3e50]">No Billable Cases Found</h2>
        <p className="text-sm text-slate-500 mt-2">Process an excel sheet to generate email drafts.</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#2d3e50] text-white flex items-center justify-center text-xs font-black">
              4
            </span>
            <h1 className="text-xl font-black text-[#2d3e50]">Email Drafting Module</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure recipients and generate email drafts for your clients based on billing outputs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-[#2d3e50]">Select Client</h3>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
            {clients.map(client => (
              <button
                key={client}
                onClick={() => setSelectedClient(client)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  selectedClient === client 
                    ? 'bg-[#eb8a23]/10 text-[#eb8a23] border border-[#eb8a23]/30' 
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="truncate max-w-[180px]">{client}</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">
                    {clientGroups[client].length}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-[#2d3e50]">Draft for {selectedClient}</h2>
            <div className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              ₹ {totalAmount.toLocaleString('en-IN')} Total
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="w-12 text-right text-xs font-bold text-slate-500">To:</label>
              <input 
                type="email" 
                value={localContact.toEmail}
                onChange={(e) => setLocalContact(prev => ({ ...prev, toEmail: e.target.value }))}
                placeholder="client.finance@example.com" 
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23]"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <label className="w-12 text-right text-xs font-bold text-slate-500">CC:</label>
              <input 
                type="email" 
                value={localContact.ccEmail}
                onChange={(e) => setLocalContact(prev => ({ ...prev, ccEmail: e.target.value }))}
                placeholder="internal.audit@infominer.com" 
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23]"
              />
              <button 
                onClick={handleSaveContacts}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4" />}
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
              <label className="w-12 text-right text-xs font-bold text-slate-500">Details:</label>
              <select
                value={breakdownLevel}
                onChange={(e) => setBreakdownLevel(e.target.value as any)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23] bg-white"
              >
                <option value="none">No Breakdown</option>
                <option value="product">Breakdown by Product</option>
                <option value="branch">Breakdown by Branch</option>
                <option value="state">Breakdown by State</option>
                <option value="city">Breakdown by City</option>
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="w-12 text-right text-xs font-bold text-slate-500">Subject:</label>
              <input 
                type="text" 
                value={emailSubject}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-none"
              />
            </div>
            
            <div className="flex items-start gap-3 pt-2">
              <label className="w-12 text-right text-xs font-bold text-slate-500 pt-3">Body:</label>
              <div className="flex-1 relative flex flex-col gap-2">
                <textarea 
                  value={emailBody}
                  readOnly
                  rows={10}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-mono focus:outline-none leading-relaxed resize-none scrollbar-thin"
                />
                
                {/* Visual Attachment Indicator */}
                <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl w-max">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {`${selectedClient.substring(0, 15)}_Report.xlsx`}
                    </div>
                    <div className="text-[10px] text-indigo-600 font-medium">
                      (Remember to download & attach)
                    </div>
                  </div>
                </div>

                {/* Excel Data Preview */}
                <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 border-b border-slate-200 flex justify-between items-center">
                    <span>Excel Data Preview (First 5 records)</span>
                    <span className="font-normal text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      Total: {currentCases.length} rows
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-1.5 font-semibold">App No</th>
                          <th className="px-3 py-1.5 font-semibold">Applicant</th>
                          <th className="px-3 py-1.5 font-semibold">City</th>
                          <th className="px-3 py-1.5 font-semibold">Product</th>
                          <th className="px-3 py-1.5 font-semibold text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {currentCases.slice(0, 5).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 font-mono text-slate-600">{c.clientApplicationNumber}</td>
                            <td className="px-3 py-1.5 font-medium text-slate-700 truncate max-w-[120px]">{c.applicantName}</td>
                            <td className="px-3 py-1.5 text-slate-600">{c.city || '—'}</td>
                            <td className="px-3 py-1.5 text-slate-600">{c.product || '—'}</td>
                            <td className="px-3 py-1.5 font-mono text-slate-700 text-right">{c.billingAmt}</td>
                          </tr>
                        ))}
                        {currentCases.length > 5 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-center text-slate-400 italic">
                              ...and {currentCases.length - 5} more records
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button 
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#eb8a23] transition"
                  title="Copy email body to clipboard"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              onClick={handleDownloadAttachment}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Download Attachment
            </button>
            <button 
              onClick={handleDraftEmail}
              disabled={!localContact.toEmail}
              className="inline-flex items-center gap-2 bg-[#2d3e50] hover:bg-[#1a2530] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 text-[#eb8a23]" />
              Draft in Email Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
