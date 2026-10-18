import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { InfominerLogo } from './InfominerLogo';
import { useAuth } from '../../context/AuthContext';
import {
  Upload,
  TableProperties,
  GitFork,
  FileSpreadsheet,
  BarChart3,
  Download,
  History,
  BookOpen,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Mail,
  Scale,
} from 'lucide-react';

export type ActiveTab =
  | 'upload'
  | 'rates'
  | 'mapping'
  | 'records'
  | 'analytics'
  | 'invoices'
  | 'reconciliation'
  | 'emails'
  | 'reports'
  | 'audit'
  | 'docs';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  totalBilled: number;
  totalCases: number;
  exceptionCount: number;
  fileName?: string;
  onLoadSampleData: () => void;
}

type NavItem = {
  id: ActiveTab;
  label: string;
  step?: number;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  badgeTone?: 'neutral' | 'warn';
};

const inr = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalBilled,
  totalCases,
  exceptionCount,
  fileName,
  onLoadSampleData,
}) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const navItems: NavItem[] = [
    { id: 'upload', step: 1, label: 'Upload', icon: Upload, badge: totalCases ? inr(totalCases) : undefined },
    { id: 'analytics', step: 2, label: 'Dashboard', icon: BarChart3 },
    {
      id: 'records',
      step: 3,
      label: 'Case Records',
      icon: FileSpreadsheet,
      badge: exceptionCount > 0 ? `${inr(exceptionCount)} exc` : undefined,
      badgeTone: 'warn',
    },
    { id: 'mapping', step: 4, label: 'Client Mapping', icon: GitFork },
    { id: 'rates', step: 5, label: 'Rate Sheet', icon: TableProperties },
    { id: 'reconciliation', step: 6, label: 'Settlements', icon: Scale },
    { id: 'emails', step: 7, label: 'Emails', icon: Mail },
    { id: 'reports', step: 8, label: 'Reports', icon: Download },
    { id: 'audit', step: 9, label: 'Audit Trail', icon: History },
    { id: 'docs', label: 'Help', icon: BookOpen },
  ];

  const initials = (user?.name || 'U')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl backdrop-saturate-150 print:hidden"
      id="main-header"
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5">
            <button
              onClick={() => setActiveTab('analytics')}
              className="shrink-0 rounded-lg"
              aria-label="Go to dashboard"
            >
              <InfominerLogo size="md" showTagline />
            </button>

            {fileName && totalCases > 0 && (
              <div className="hidden min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-xs lg:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="truncate font-medium max-w-[220px]" title={fileName}>
                  {fileName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {totalCases > 0 ? (
              <div className="hidden items-center divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-xs md:flex">
                <div className="px-3.5 py-1.5 text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Billing</div>
                  <div className="text-sm font-bold tabular-nums text-ink-800">₹{inr(totalBilled)}</div>
                </div>
                <div className="px-3.5 py-1.5 text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cases</div>
                  <div className="text-sm font-bold tabular-nums text-ink-800">{inr(totalCases)}</div>
                </div>
              </div>
            ) : (
              <button
                onClick={onLoadSampleData}
                className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 sm:inline-flex"
                id="load-sample-btn"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Load sample report
              </button>
            )}

            {/* Account menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2.5 rounded-xl border border-transparent py-1 pl-1 pr-2 hover:border-slate-200 hover:bg-slate-50"
                id="user-profile-menu-button"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-ink text-xs font-bold text-white shadow-sm ring-2 ring-white">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[130px] truncate text-xs font-semibold text-ink-800">{user?.name || 'User'}</span>
                  <span className="block text-[11px] capitalize text-slate-500">{user?.role}</span>
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: 'top right' }}
                    className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                  >
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="truncate text-sm font-semibold text-ink-900">{user?.name}</div>
                      <div className="truncate text-xs text-slate-500">{user?.email}</div>
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        <ShieldCheck className="h-3 w-3" />
                        <span className="capitalize">{user?.role}</span>
                      </div>
                    </div>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Workflow tabs */}
        <nav
          className="no-scrollbar -mb-px flex gap-1 overflow-x-auto pb-2"
          id="main-nav-tabs"
          aria-label="Workflow steps"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                id={`tab-${item.id}`}
                aria-current={active ? 'page' : undefined}
                className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium ${
                  active ? 'text-ink-900' : 'text-slate-500 hover:bg-slate-100/80 hover:text-ink-800'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-slate-200"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {item.step ? (
                    <span
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded-md text-[10px] font-bold ${
                        active ? 'bg-brand-600 text-white' : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      {item.step}
                    </span>
                  ) : (
                    <Icon className={`h-4 w-4 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
                  )}
                  {item.label}
                  {item.badge && (
                    <span
                      className={`rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ${
                        item.badgeTone === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
