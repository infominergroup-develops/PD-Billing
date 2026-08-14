import React from 'react';
import {
  BookOpen,
  Server,
  ShieldCheck,
  Zap,
  FileSpreadsheet,
  Receipt,
  Layers,
  Code2,
  Terminal,
} from 'lucide-react';
import { InfominerLogo } from '../common/InfominerLogo';

export const DocumentationView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200" id="docs-view-container">
      {/* Hero Card */}
      <div className="bg-[#2d3e50] text-white rounded-2xl p-8 border border-slate-700 shadow-md">
        <div className="flex items-center gap-4 mb-4">
          <InfominerLogo size="lg" variant="light" />
        </div>
        <h1 className="text-2xl font-black">
          Infominer PD Billing &amp; Verification Automation Engine
        </h1>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl">
          Enterprise operational manual, slab calculation mathematics, rate reconciliation architecture, and instant production deployment guide.
        </p>
      </div>

      {/* Logic & Calculation Architecture */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#2d3e50] flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#eb8a23]" />
          1. Billing Calculation &amp; Priority Logic
        </h2>

        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <p>
            The platform executes the standard multi-tiered Personal Discussion (PD) verification billing algorithm:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-[#2d3e50] text-sm mb-2">A. Deduplication &amp; Priority KM Resolution</h3>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li><strong>Deduplication Key:</strong> <code>Case ID</code> (combining activity sub-rows).</li>
                <li>
                  <strong>KM Resolution Hierarchy:</strong>
                  <ol className="list-decimal pl-4 mt-1 font-mono text-[11px] text-[#eb8a23]">
                    <li>KM Used for Billing (if already fed)</li>
                    <li>KM feeded by MIS</li>
                    <li>KM_Running_One_Side</li>
                  </ol>
                </li>
                <li>
                  <strong>Cancellation Rule:</strong> Status <code>PD cancelled not to be billed</code> is assigned ₹0 and routed to the Cancelled Cases audit tab.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-[#2d3e50] text-sm mb-2">B. Master Rate Sheet &amp; Slabs</h3>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li><strong>Flat Rate:</strong> If Flat Rate ₹ is defined for a client, it is applied directly.</li>
                <li><strong>Slab 1:</strong> Applied when <code>KM &le; Slab 1 Max KM</code>.</li>
                <li><strong>Slab 2:</strong> Applied when <code>KM &le; Slab 2 Max KM</code>.</li>
                <li><strong>Beyond Rate:</strong> Applied when <code>KM &gt; Slab 2 Max KM</code>.</li>
                <li><strong>State Rules:</strong> Matches specific State first; falls back to &quot;All States&quot; blank rule.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};
