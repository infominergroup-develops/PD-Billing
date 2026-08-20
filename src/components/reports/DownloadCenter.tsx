import React from 'react';
import { CaseRecord, RateRule } from '../../types';
import {
  Download,
  Building2,
  MapPin,
  Package,
  FileSpreadsheet,
  AlertOctagon,
  Sparkles,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  exportBillingReport,
  exportSingleClientReport,
  exportBankMISReport,
} from '../../utils/billingEngine';

interface DownloadCenterProps {
  cases: CaseRecord[];
  rates: RateRule[];
  onAuditExport: (reportName: string) => void;
}

export const DownloadCenter: React.FC<DownloadCenterProps> = ({
  cases,
  rates,
  onAuditExport,
}) => {
  const billable = cases.filter((c) => c.isBillable);
  const exceptions = cases.filter((c) => c.isException);
  const cancelled = cases.filter((c) => c.isCancelled);

  // Group by client
  const clientAgg: Record<
    string,
    { total: number; billable: number; exceptions: number; cancelled: number; amount: number; cases: CaseRecord[] }
  > = {};

  cases.forEach((c) => {
    const k = c.clientDb || 'Unknown';
    if (!clientAgg[k]) {
      clientAgg[k] = { total: 0, billable: 0, exceptions: 0, cancelled: 0, amount: 0, cases: [] };
    }
    clientAgg[k].total += 1;
    clientAgg[k].cases.push(c);
    if (c.isCancelled) clientAgg[k].cancelled += 1;
    else if (c.isBillable) {
      clientAgg[k].billable += 1;
      clientAgg[k].amount += c.billingAmt;
    } else {
      clientAgg[k].exceptions += 1;
    }
  });

  const clientRows = Object.entries(clientAgg).sort((a, b) => b[1].amount - a[1].amount);

  const handleGlobalExport = (type: 'client' | 'state' | 'product' | 'all' | 'exceptions') => {
    exportBillingReport(type, cases, rates, 'Infominer_PD_Billing');
    onAuditExport(`Bulk Export: ${type.toUpperCase()}_REPORT`);
  };

  const handleBankMISExport = () => {
    exportBankMISReport(cases, 'Infominer_Bank_MIS');
    onAuditExport('Bulk Export: BANK_MIS_REPORT');
  };

  const handleClientExport = (
    clientName: string,
    clientCases: CaseRecord[],
    groupBy: 'branch' | 'product' | 'all'
  ) => {
    exportSingleClientReport(clientName, clientCases, rates, groupBy);
    onAuditExport(`Client Export: ${clientName} (${groupBy.toUpperCase()})`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200" id="download-center-container">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#2d3e50] text-white flex items-center justify-center text-xs font-black">
            7
          </span>
          <h1 className="text-xl font-black text-[#2d3e50]">Multi-Format Excel Export Center</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Export verified billing workbooks formatted with executive summary sheets, master rate annexures, group worksheets, and exception tabs.
        </p>

        {/* Global Download Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-6">
          {/* Bank MIS */}
          <div
            onClick={handleBankMISExport}
            className="p-5 rounded-2xl border border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 hover:shadow-md transition cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3 transition">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xs text-[#2d3e50]">Bank Presentable MIS</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Grouped by City &amp; Client format
            </p>
          </div>
          {/* Client-wise */}
          <div
            onClick={() => handleGlobalExport('client')}
            className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#2d3e50] hover:shadow-md transition cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#2d3e50] group-hover:bg-[#2d3e50] group-hover:text-white flex items-center justify-center mx-auto mb-3 transition">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xs text-[#2d3e50]">Client-Wise Excel</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              One worksheet per client + Rate Annexure
            </p>
          </div>

          {/* State-wise */}
          <div
            onClick={() => handleGlobalExport('state')}
            className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#2d3e50] hover:shadow-md transition cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#2d3e50] group-hover:bg-[#2d3e50] group-hover:text-white flex items-center justify-center mx-auto mb-3 transition">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xs text-[#2d3e50]">State-Wise Excel</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Individual tabs per state / geographic territory
            </p>
          </div>

          {/* Product-wise */}
          <div
            onClick={() => handleGlobalExport('product')}
            className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#2d3e50] hover:shadow-md transition cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#2d3e50] group-hover:bg-[#2d3e50] group-hover:text-white flex items-center justify-center mx-auto mb-3 transition">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xs text-[#2d3e50]">Product-Wise Excel</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Tab per loan type (HL, LAP, Business, Education)
            </p>
          </div>

          {/* Full Master */}
          <div
            onClick={() => handleGlobalExport('all')}
            className="p-5 rounded-2xl border border-[#eb8a23] bg-orange-50/40 hover:bg-orange-50 hover:shadow-md transition cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#eb8a23] text-white flex items-center justify-center mx-auto mb-3 transition">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xs text-[#2d3e50]">Full Consolidated</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              All billable cases in single unified master sheet
            </p>
          </div>

          {/* Exceptions */}
          <div
            onClick={() => handleGlobalExport('exceptions')}
            className="p-5 rounded-2xl border border-amber-300 bg-amber-50/40 hover:bg-amber-50 hover:shadow-md transition cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-3 transition">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xs text-[#2d3e50]">Exception Audit</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Missing KM, unmapped institutions &amp; cancellations
            </p>
          </div>
        </div>
      </div>

      {/* Per-Client Download Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-[#2d3e50] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#eb8a23]" />
              Client Breakdown &amp; Individual Workbooks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Download separate Excel files for any bank or NBFC broken down by branch or product
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {clientRows.length} Institutions
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#2d3e50] text-white font-bold">
              <tr>
                <th className="p-3">Client / Bank Name</th>
                <th className="p-3 text-center">Total Cases</th>
                <th className="p-3 text-center">Billable</th>
                <th className="p-3 text-center">Exceptions</th>
                <th className="p-3 text-right">Total Billing (₹)</th>
                <th className="p-3 text-center min-w-[260px]">Download Formats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {clientRows.map(([clientName, data]) => (
                <tr key={clientName} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-[#2d3e50]">{clientName}</td>
                  <td className="p-3 text-center text-slate-600">{data.total}</td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {data.billable}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {data.exceptions > 0 ? (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {data.exceptions}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-black text-[#2d3e50]">
                    ₹{data.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleClientExport(clientName, data.cases, 'branch')}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#2d3e50] hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                        title="One sheet per branch for this client"
                      >
                        🏬 Branch-wise
                      </button>
                      <button
                        onClick={() => handleClientExport(clientName, data.cases, 'product')}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#2d3e50] hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                        title="One sheet per product for this client"
                      >
                        📦 Product-wise
                      </button>
                      <button
                        onClick={() => handleClientExport(clientName, data.cases, 'all')}
                        className="px-2.5 py-1 rounded-lg bg-[#2d3e50] hover:bg-[#1e293b] text-white text-[11px] font-bold transition cursor-pointer"
                        title="Single comprehensive sheet for this client"
                      >
                        📊 Full
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
