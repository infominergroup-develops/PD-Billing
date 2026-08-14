import React, { useState } from 'react';
import { RateRule, CaseRecord } from '../../types';
import {
  GitFork,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Zap,
  ArrowRight,
  Building,
  Search,
} from 'lucide-react';
import { norm } from '../../utils/billingEngine';

interface ClientMappingSectionProps {
  allCases: CaseRecord[];
  rates: RateRule[];
  clientMap: Record<string, string>;
  onUpdateMapping: (map: Record<string, string>) => void;
  onProceedToProcess: () => void;
}

export const ClientMappingSection: React.FC<ClientMappingSectionProps> = ({
  allCases,
  rates,
  clientMap,
  onUpdateMapping,
  onProceedToProcess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique DB clients and case counts
  const clientCounts: Record<string, number> = {};
  allCases.forEach((c) => {
    const k = c.clientDb || 'Unknown Client';
    clientCounts[k] = (clientCounts[k] || 0) + 1;
  });

  const dbClients = Object.entries(clientCounts).sort((a, b) => b[1] - a[1]);

  const masterClientNames = Array.from(
    new Set(rates.map((r) => r.client).filter(Boolean))
  ).sort();

  const hasRateConfigured = (masterName: string) => {
    if (!masterName) return false;
    return rates.some(
      (r) =>
        norm(r.client) === norm(masterName) &&
        (r.flat !== null || r.s1r !== null || r.s2r !== null || r.s3r !== null)
    );
  };

  const handleSelectChange = (dbName: string, masterName: string) => {
    const updated = { ...clientMap, [dbName]: masterName };
    onUpdateMapping(updated);
  };

  const autoMapAll = () => {
    const updated = { ...clientMap };
    dbClients.forEach(([dbName]) => {
      if (!updated[dbName]) {
        // Look for close substring match in master rates
        const match = masterClientNames.find((m) =>
          norm(String(m)).includes(norm(String(dbName))) || norm(String(dbName)).includes(norm(String(m)))
        );
        if (match) {
          updated[dbName] = match;
        }
      }
    });
    onUpdateMapping(updated);
  };

  const filteredClients = dbClients.filter(([name]) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mappedCount = dbClients.filter(([name]) => Boolean(clientMap[name])).length;
  const unmappedCount = dbClients.length - mappedCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200" id="client-mapping-container">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2d3e50] text-white flex items-center justify-center text-xs font-black">
                3
              </span>
              <h1 className="text-xl font-black text-[#2d3e50]">Client Name Reconciliation</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Map the client names found in your MC database to the official rate sheet entry.
              Any unmapped clients will be flagged as exceptions and can be resolved here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={autoMapAll}
              className="inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-[#eb8a23] border border-orange-200 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              id="auto-match-mapping-btn"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Match Names</span>
            </button>

            <button
              onClick={onProceedToProcess}
              className="inline-flex items-center gap-1.5 bg-[#eb8a23] hover:bg-[#d97917] text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition cursor-pointer"
              id="run-billing-btn"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Process &amp; Recalculate</span>
            </button>
          </div>
        </div>

        {/* Search & Statistics */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter database client..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#eb8a23]"
            />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-500">
              Total Clients in DB: <strong className="text-[#2d3e50]">{dbClients.length}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
              <CheckCircle2 className="w-3 h-3" /> {mappedCount} Mapped
            </span>
            {unmappedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
                <AlertTriangle className="w-3 h-3" /> {unmappedCount} Unmapped
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {dbClients.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No case data loaded. Please upload your MC Report Excel file in Step 1.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" id="client-mapping-table">
              <thead className="bg-[#2d3e50] text-white font-bold">
                <tr>
                  <th className="p-3">Database Client Name</th>
                  <th className="p-3 w-28 text-center">Cases in DB</th>
                  <th className="p-3 min-w-[280px]">Target Rate Sheet Client</th>
                  <th className="p-3 w-40 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClients.map(([dbName, count]) => {
                  const mapped = clientMap[dbName] || '';
                  const hasRates = hasRateConfigured(mapped);

                  return (
                    <tr key={dbName} className="hover:bg-slate-50/80 transition">
                      <td className="p-3">
                        <div className="font-bold text-[#2d3e50] flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dbName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md">
                          {count}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={mapped}
                          onChange={(e) => handleSelectChange(dbName, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#eb8a23] font-semibold text-xs cursor-pointer"
                        >
                          <option value="">— Unmapped / Skip —</option>
                          {masterClientNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        {!mapped ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            <span>Unmapped</span>
                          </span>
                        ) : hasRates ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ready / Rates OK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>No Rate Configured</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
