import React, { useState } from 'react';
import { DashboardStats, CaseRecord } from '../../types';
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  XCircle,
  Building2,
  MapPin,
  FileSpreadsheet,
  ArrowUpRight,
  Filter,
  DollarSign,
  PieChart,
  Layers,
  ChevronRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  stats: DashboardStats;
  allCases: CaseRecord[];
  onNavigateTab: (tab: any) => void;
  onFilterClient?: (client: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stats,
  allCases,
  onNavigateTab,
  onFilterClient,
}) => {
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTopClients = stats.topClients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxClientAmount = stats.topClients.length > 0 ? stats.topClients[0].amount : 1;
  const maxStateAmount = stats.stateBreakdown.length > 0 ? stats.stateBreakdown[0].amount : 1;

  // Recent 5 billable cases for the live preview bento tile
  const recentCases = allCases.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="analytics-dashboard-panel">
      {/* Bento Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#2d3e50] tracking-tight">Real-Time Analytics</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eb8a23]/15 text-[#d97917] uppercase tracking-wider">
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational intelligence for {stats.totalCases.toLocaleString('en-IN')} cases across {stats.uniqueClients} financial institutions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('audit')}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            id="bento-export-audit-btn"
          >
            Export Audit
          </button>
          <button
            onClick={() => onNavigateTab('records')}
            className="px-4 py-2 bg-[#eb8a23] hover:bg-[#d97917] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            id="bento-new-entry-btn"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Manage Records</span>
          </button>
        </div>
      </header>

      {/* Bento Grid Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" id="bento-grid-container">
        {/* Bento Tile 1: Total Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#eb8a23] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#2d3e50]">
                ₹{stats.totalBillingAmt.toLocaleString('en-IN')}
              </h2>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                {stats.billableCases} billable cases
              </span>
            </div>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              +100% Verified
            </span>
          </div>
        </div>

        {/* Bento Tile 2: Active Clients */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Clients</p>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#2d3e50] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#2d3e50]">
                {stats.uniqueClients}
              </h2>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                Banks &amp; NBFC Partners
              </span>
            </div>
            <span className="text-xs text-[#eb8a23] font-bold bg-orange-50 px-2 py-0.5 rounded-md">
              Mapped Slabs
            </span>
          </div>
        </div>

        {/* Bento Tile 3: Avg Rate / Case */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Rate / Case</p>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#2d3e50]">
                ₹{stats.avgBillingPerCase.toLocaleString('en-IN')}
              </h2>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                Distance weighted average
              </span>
            </div>
            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
              Slab Tier
            </span>
          </div>
        </div>

        {/* Bento Tile 4: Automation Accuracy / System Health */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Health</p>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#2d3e50]">
                {stats.totalCases ? (100 - Math.round((stats.exceptionCases / stats.totalCases) * 100)).toFixed(1) : '100'}%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Billing Efficiency</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#eb8a23] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stats.totalCases ? Math.max(10, 100 - Math.round((stats.exceptionCases / stats.totalCases) * 100)) : 100}%`,
                }}
              ></div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 block truncate">
              {stats.exceptionCases > 0 ? `${stats.exceptionCases} exceptions need review` : 'All records resolved'}
            </span>
          </div>
        </div>

        {/* Bento Tile 5: Client-Wise Billing Distribution (Spans 2 columns) */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-[#2d3e50]">Client-Wise Billing Distribution</h3>
              <p className="text-[11px] text-slate-400">Revenue split across top institutional partners</p>
            </div>
            <span className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 font-semibold">
              {stats.topClients.length} Institutions
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-3.5 justify-center mt-2">
            {stats.topClients.slice(0, 5).map((client, idx) => {
              const colors = ['bg-[#2d3e50]', 'bg-[#eb8a23]', 'bg-[#e8a020]', 'bg-slate-700', 'bg-amber-600'];
              const barColor = colors[idx % colors.length];
              const percent = Math.round((client.amount / (maxClientAmount || 1)) * 100);

              return (
                <div key={client.name} className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]">{client.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{client.cases} cases</span>
                      <span className="font-bold text-[#2d3e50]">₹{client.amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`${barColor} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bento Tile 6: Recent Activity & Audit Logs (Spans 2 columns) */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-[#2d3e50]">Recent Verification Activity</h3>
              <p className="text-[11px] text-slate-400">System audit trail &amp; automated rate actions</p>
            </div>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs text-[#eb8a23] hover:underline font-bold"
            >
              View All Logs →
            </button>
          </div>

          <div className="space-y-3.5 overflow-hidden">
            <div className="flex items-start gap-3 border-l-2 border-[#eb8a23] pl-3 py-0.5">
              <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Live Sync</div>
              <div className="text-xs">
                <span className="font-bold text-[#2d3e50]">Billing Engine</span> recalculated{' '}
                <span className="text-[#eb8a23] font-medium">{stats.billableCases} billable cases</span> across active slabs
              </div>
            </div>

            <div className="flex items-start gap-3 border-l-2 border-slate-200 pl-3 py-0.5">
              <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Rule Match</div>
              <div className="text-xs">
                <span className="font-bold text-[#2d3e50]">Deduplication</span> resolved duplicate records by Case ID
              </div>
            </div>

            <div className="flex items-start gap-3 border-l-2 border-slate-200 pl-3 py-0.5">
              <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Compliance</div>
              <div className="text-xs">
                <span className="font-bold text-[#2d3e50]">Cancelled Cases</span> routed {stats.cancelledCases} records to zero-billing
              </div>
            </div>

            <div className="flex items-start gap-3 border-l-2 border-slate-200 pl-3 py-0.5">
              <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Security</div>
              <div className="text-xs">
                <span className="font-bold text-[#2d3e50]">System Session</span> verified in encrypted local storage
              </div>
            </div>
          </div>
        </div>

        {/* Bento Tile 7: State-Wise Billing Bento Block (Spans 2 columns) */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-[#2d3e50] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#eb8a23]" />
                Geographic Territory Distribution
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">State and regional operations volume</p>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
              {stats.stateBreakdown.length} Territories
            </span>
          </div>

          <div className="mt-3 space-y-3 max-h-52 overflow-y-auto pr-1">
            {stats.stateBreakdown.map((st) => {
              const percent = Math.round((st.amount / (maxStateAmount || 1)) * 100);
              return (
                <div key={st.state} className="text-xs">
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span className="truncate">{st.state || 'Other State'}</span>
                    <span className="font-bold text-[#2d3e50]">₹{st.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2d3e50] h-full rounded-full"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bento Tile 8: KM Slab Distribution Bento Block (Spans 2 columns) */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-[#2d3e50] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#eb8a23]" />
                KM Slab Utilization
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Flat vs distance tier breakdown</p>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
              {stats.slabBreakdown.length} Slabs Active
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {stats.slabBreakdown.map((sl) => (
              <div
                key={sl.slab}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 block truncate max-w-[120px]">{sl.slab || 'Standard'}</span>
                  <span className="text-[10px] text-slate-400">{sl.count} cases</span>
                </div>
                <span className="font-black text-[#eb8a23] text-sm">
                  ₹{sl.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bento Tile 9: Recent Billing Records Table (Spans full 4 columns) */}
        <div className="md:col-span-2 lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#2d3e50]">Recent Verified Billing Records</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Live case-level rate calculations and status</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Live Verification
              </span>
              <button
                onClick={() => onNavigateTab('records')}
                className="text-xs font-bold text-[#eb8a23] hover:underline"
              >
                Open Full Grid ({allCases.length}) →
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-3">Case ID</th>
                  <th className="px-6 py-3">Client Name</th>
                  <th className="px-6 py-3">Applicant Name</th>
                  <th className="px-6 py-3">KM / Slab</th>
                  <th className="px-6 py-3 text-right">Billed Rate</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentCases.map((c) => (
                  <tr key={c.caseId} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-3.5 font-mono font-bold text-[#2d3e50]">#{c.caseId}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{c.clientDb || c.clientRaw}</td>
                    <td className="px-6 py-3.5 text-slate-600">{c.applicantName}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-slate-700 font-bold">{c.kmUsedForBilling} KM</span>
                      <span className="text-slate-400 text-[10px] ml-1">({c.slabApplied})</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-[#2d3e50]">
                      ₹{c.billingAmt.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {c.isCancelled ? (
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          Cancelled
                        </span>
                      ) : c.isBillable ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          Billable
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          Exception
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => onNavigateTab('records')}
                        className="text-[#eb8a23] font-bold text-xs hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <span className="mx-2 text-slate-300">|</span>
                      <button
                        onClick={() => onNavigateTab('records')}
                        className="text-[#2d3e50] font-bold text-xs hover:underline cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

