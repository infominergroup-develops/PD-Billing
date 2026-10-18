import React, { useEffect, useRef } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';

// ═══════════════════════════════════════════════════════════════
// Shared UI primitives for the Infominer design system
// ═══════════════════════════════════════════════════════════════

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Parent/child variants for a single staggered entrance of a grid of cards. */
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
export const staggerChild = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};

const inr = (n: number, digits = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: digits });

/** Counts up to `value` once when scrolled into view (writes the DOM directly — no re-render per frame). */
export const AnimatedNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  digits?: number;
  className?: string;
}> = ({ value, prefix = '', suffix = '', digits = 0, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const fromRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const render = (v: number) => (el.textContent = `${prefix}${inr(v, digits)}${suffix}`);
    if (reduce) {
      render(value);
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration: 0.9,
      ease: EASE_OUT,
      onUpdate: render,
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, inView, reduce, prefix, suffix, digits]);

  return (
    <span ref={ref} className={`tabular-nums ${className || ''}`}>
      {prefix}
      {inr(reduce ? value : 0, digits)}
      {suffix}
    </span>
  );
};

type Tone = 'brand' | 'ink' | 'emerald' | 'amber' | 'red' | 'slate';
const TONE: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600 ring-brand-100',
  ink: 'bg-ink-50 text-ink-600 ring-ink-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
  slate: 'bg-slate-50 text-slate-500 ring-slate-100',
};

export const StatCard: React.FC<{
  label: string;
  icon: React.FC<{ className?: string }>;
  tone?: Tone;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ label, icon: Icon, tone = 'slate', children, footer }) => (
  <motion.div variants={staggerChild} className="card card-hover flex flex-col p-5">
    <div className="flex items-center justify-between">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${TONE[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-3 text-[1.65rem] font-bold leading-none tracking-tight text-ink-900">{children}</div>
    {footer && <div className="mt-3 text-xs text-slate-500">{footer}</div>}
  </motion.div>
);

export const Panel: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.FC<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, action, className = '', bodyClassName = 'p-5', children }) => (
  <motion.section variants={staggerChild} className={`card flex flex-col ${className}`}>
    <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          {Icon && <Icon className="h-4 w-4 text-brand-500" />}
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
    <div className={`flex-1 ${bodyClassName}`}>{children}</div>
  </motion.section>
);

/** Horizontal bar whose fill grows in when first visible. */
export const BarRow: React.FC<{
  label: string;
  value: string;
  meta?: string;
  percent: number;
  color?: string;
  delay?: number;
}> = ({ label, value, meta, percent, color = 'bg-ink', delay = 0 }) => (
  <div>
    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
      <span className="truncate font-medium text-slate-700" title={label}>
        {label}
      </span>
      <span className="flex shrink-0 items-baseline gap-2">
        {meta && <span className="text-[11px] text-slate-400 tabular-nums">{meta}</span>}
        <span className="font-semibold text-ink-900 tabular-nums">{value}</span>
      </span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <motion.div
        className={`h-full origin-left rounded-full ${color}`}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: Math.max(0, Math.min(1, percent / 100)) }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay, ease: EASE_OUT }}
      />
    </div>
  </div>
);

export type CaseStatus = 'billable' | 'exception' | 'cancelled' | 'leftover';
const STATUS: Record<CaseStatus, string> = {
  billable: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  exception: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/15',
  leftover: 'bg-sky-50 text-sky-700 ring-sky-600/15',
};
export const StatusBadge: React.FC<{ status: CaseStatus }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${STATUS[status]}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {status}
  </span>
);

export const PageHeader: React.FC<{
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
}> = ({ title, description, eyebrow, actions }) => (
  <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div className="min-w-0">
      {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-600">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-[1.75rem]">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 hover:shadow-md disabled:opacity-60',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 shadow-xs hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60',
  ghost: 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand-600 hover:bg-brand-50',
};
