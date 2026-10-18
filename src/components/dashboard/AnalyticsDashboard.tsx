import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { DashboardStats, CaseRecord } from '../../types';
import {
  IndianRupee,
  FileSpreadsheet,
  Building2,
  Gauge,
  MapPin,
  Layers,
  AlertTriangle,
  ArrowRight,
  Upload,
  History,
  CheckCircle2,
} from 'lucide-react';
import {
  AnimatedNumber,
  BarRow,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  btn,
  staggerParent,
  staggerChild,
  CaseStatus,
} from '../common/ui';

interface AnalyticsDashboardProps {
  stats: DashboardStats;
  allCases: CaseRecord[];
  onNavigateTab: (tab: any) => void;
  onFilterClient?: (client: string) => void;
}

const inr = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const plural = (n: number, word: string) => `${inr(n)} ${word}${n === 1 ? '' : 's'}`;
const statusOf = (c: CaseRecord): CaseStatus =>
  c.isCancelled ? 'cancelled' : c.isLeftover ? 'leftover' : c.isBillable ? 'billable' : 'exception';

const CLIENT_COLORS = ['bg-ink', 'bg-brand-500', 'bg-sun', 'bg-ink-400', 'bg-brand-300'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ stats, allCases, onNavigateTab }) => {
  const exceptionReasons = useMemo(() => {
    const m = new Map<string, number>();
    allCases.forEach((c) => {
      if (c.isException) m.set(c.remarks || 'Unknown', (m.get(c.remarks || 'Unknown') || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [allCases]);

  if (stats.totalCases === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200"
        >
          <Upload className="h-7 w-7 text-brand-500" />
        </motion.div>
        <h2 className="text-xl font-bold tracking-tight text-ink-900">No billing data yet</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Upload an activity-level MC report to see billing totals, exceptions and client breakdowns here.
        </p>
        <button onClick={() => onNavigateTab('upload')} className={`${btn.primary} mt-6`}>
          <FileSpreadsheet className="h-4 w-4" />
          Upload a report
        </button>
      </div>
    );
  }

  const billableBase = stats.totalCases - stats.cancelledCases;
  const coverage = billableBase ? (stats.billableCases / billableBase) * 100 : 100;
  const maxClient = Math.max(1, ...stats.topClients.map((c) => c.amount));
  const maxState = Math.max(1, ...stats.stateBreakdown.map((s) => s.amount));
  const recentCases = allCases.slice(0, 6);

  return (
    <div className="space-y-6" id="analytics-dashboard-panel">
      <PageHeader
        eyebrow="Dashboard"
        title="Billing overview"
        description={`${inr(stats.totalCases)} cases across ${stats.uniqueClients} clients`}
        actions={
          <>
            <button onClick={() => onNavigateTab('audit')} className={btn.secondary} id="bento-export-audit-btn">
              <History className="h-4 w-4" />
              Audit trail
            </button>
            <button onClick={() => onNavigateTab('records')} className={btn.primary} id="bento-new-entry-btn">
              <FileSpreadsheet className="h-4 w-4" />
              Case records
            </button>
          </>
        }
      />

      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        id="bento-grid-container"
      >
        <StatCard label="Total billing" icon={IndianRupee} tone="brand" footer={`${plural(stats.billableCases, 'billable case')}`}>
          <AnimatedNumber value={stats.totalBillingAmt} prefix="₹" />
        </StatCard>

        <StatCard
          label="Cases counted"
          icon={FileSpreadsheet}
          tone="ink"
          footer={
            <>
              {plural(stats.exceptionCases, 'exception')} · {inr(stats.cancelledCases)} cancelled
              {stats.deletedRows > 0 && ` · ${inr(stats.deletedRows)} deleted rows excluded`}
            </>
          }
        >
          <AnimatedNumber value={stats.totalCases} />
        </StatCard>

        <StatCard
          label="Average per billable case"
          icon={Building2}
          tone="slate"
          footer={`Across ${stats.uniqueClients} client${stats.uniqueClients === 1 ? '' : 's'}`}
        >
          <AnimatedNumber value={stats.avgBillingPerCase} prefix="₹" />
        </StatCard>

        <StatCard
          label="Billing coverage"
          icon={Gauge}
          tone={coverage >= 95 ? 'emerald' : 'amber'}
          footer={
            <div>
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className={`h-full origin-left rounded-full ${coverage >= 95 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: coverage / 100 }}
                  transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              Billable share of non-cancelled cases
            </div>
          }
        >
          <AnimatedNumber value={coverage} digits={1} suffix="%" />
        </StatCard>
      </motion.div>

      <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Billing by client"
          subtitle="Top clients by billed amount"
          icon={Building2}
          action={<span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{stats.topClients.length} clients</span>}
        >
          <div className="space-y-4">
            {stats.topClients.slice(0, 6).map((c, i) => (
              <BarRow
                key={c.name}
                label={c.name}
                value={`₹${inr(c.amount)}`}
                meta={`${inr(c.cases)} cases`}
                percent={(c.amount / maxClient) * 100}
                color={CLIENT_COLORS[i % CLIENT_COLORS.length]}
                delay={i * 0.05}
              />
            ))}
          </div>
        </Panel>

        <Panel
          title="Needs review"
          subtitle="Exceptions grouped by reason"
          icon={AlertTriangle}
          action={
            stats.exceptionCases > 0 && (
              <button onClick={() => onNavigateTab('records')} className={btn.ghost}>
                Review <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )
          }
        >
          {exceptionReasons.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-ink-900">Every case has a rate</p>
              <p className="text-xs text-slate-500">No exceptions to resolve.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {exceptionReasons.map(([reason, count]) => (
                <li key={reason} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <span className="flex min-w-0 items-center gap-2.5 text-sm text-slate-700">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <span className="truncate" title={reason}>
                      {reason}
                    </span>
                  </span>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-800">
                    {inr(count)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Billing by state"
          subtitle="Regional distribution"
          icon={MapPin}
          bodyClassName="p-5 max-h-72 overflow-y-auto"
        >
          <div className="space-y-4">
            {stats.stateBreakdown.map((s, i) => (
              <BarRow
                key={s.state}
                label={s.state || 'Unassigned'}
                value={`₹${inr(s.amount)}`}
                meta={`${inr(s.count)} cases`}
                percent={(s.amount / maxState) * 100}
                delay={Math.min(i, 8) * 0.04}
              />
            ))}
          </div>
        </Panel>

        <Panel title="KM slab usage" subtitle="Cases and billing per rate slab" icon={Layers}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {stats.slabBreakdown.map((s) => (
              <div
                key={s.slab}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 transition-colors hover:border-slate-200 hover:bg-white"
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">{s.slab || 'Standard'}</span>
                  <span className="text-xs text-slate-500 tabular-nums">{inr(s.count)} cases</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-brand-600">₹{inr(s.amount)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </motion.div>

      <motion.section variants={staggerChild} initial="hidden" animate="show" className="card overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Latest records</h3>
            <p className="mt-0.5 text-xs text-slate-500">First rows of the current dataset</p>
          </div>
          <button onClick={() => onNavigateTab('records')} className={btn.ghost}>
            All {inr(allCases.length)} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Application no.</th>
                <th className="px-5 py-2.5 font-medium">Client</th>
                <th className="px-5 py-2.5 font-medium">Applicant</th>
                <th className="px-5 py-2.5 font-medium">KM · slab</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCases.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-ink-800">{c.clientApplicationNumber}</td>
                  <td className="max-w-[220px] truncate px-5 py-3 text-slate-700">{c.clientDb}</td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-slate-600">{c.applicantName}</td>
                  <td className="px-5 py-3 text-slate-600">
                    <span className="tabular-nums">{c.kmUsedForBilling ?? '—'}</span>
                    {c.slabApplied && <span className="ml-1.5 text-xs text-slate-400">{c.slabApplied}</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-900">₹{inr(c.billingAmt)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={statusOf(c)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
};
