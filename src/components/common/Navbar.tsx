import React, { useState } from 'react';
import { InfominerLogo } from './InfominerLogo';
import { useAuth } from '../../context/AuthContext';
import {
  Upload,
  TableProperties,
  GitFork,
  FileSpreadsheet,
  BarChart3,
  Receipt,
  Download,
  History,
  BookOpen,
  User,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Mail,
  Scale,
} from 'lucide-react';
import { UserRole } from '../../types';

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

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalBilled,
  totalCases,
  exceptionCount,
  fileName,
  onLoadSampleData,
}) => {
  const { user, logout, switchUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number; badgeColor?: string }[] = [
    { id: 'upload', label: '1. Upload Data', icon: Upload, badge: totalCases ? `${totalCases}` : undefined },
    { id: 'analytics', label: '2. Live Dashboard', icon: BarChart3 },
    { id: 'records', label: '3. Case Records', icon: FileSpreadsheet, badge: exceptionCount > 0 ? `${exceptionCount} exp` : undefined, badgeColor: 'bg-amber-500 text-white' },
    { id: 'mapping', label: '4. Client Mapping', icon: GitFork },
    { id: 'rates', label: '5. Rate Sheet', icon: TableProperties },
    { id: 'reconciliation', label: '6. Settlements', icon: Scale },
    { id: 'emails', label: '7. Draft Emails', icon: Mail },
    { id: 'reports', label: '8. Export Reports', icon: Download },
    { id: 'audit', label: '9. Audit Trail', icon: History },
    { id: 'docs', label: 'Help & Docs', icon: BookOpen },
  ];

  return (
    <header className="bg-[#2d3e50] text-white shadow-md sticky top-0 z-40 border-b border-[#1e293b] print:hidden" id="main-header">
      {/* Top Utility Bar */}
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-[#1e293b]/80">
          {/* Brand Logo & System Status */}
          <div className="flex items-center gap-6">
            <div className="cursor-pointer" onClick={() => setActiveTab('analytics')}>
              <InfominerLogo size="md" variant="light" showTagline={true} />
            </div>

            <div className="hidden lg:flex items-center gap-2 text-slate-300 text-xs bg-[#1e293b]/70 px-3 py-1.5 rounded-xl border border-[#1e293b]">
              <div className="w-2 h-2 rounded-full bg-[#eb8a23] animate-pulse"></div>
              <span className="font-medium">System Automated</span>
              {fileName && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-slate-300 truncate max-w-[160px]">{fileName}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics & User Profile */}
          <div className="flex items-center gap-3">
            {totalCases > 0 && (
              <div className="hidden md:flex items-center gap-4 bg-[#1e293b] px-3.5 py-1.5 rounded-xl border border-[#1e293b]">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Revenue</div>
                  <div className="text-sm font-black text-[#eb8a23]">₹{totalBilled.toLocaleString('en-IN')}</div>
                </div>
                <div className="w-px h-6 bg-slate-700/60"></div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cases</div>
                  <div className="text-sm font-bold text-white">{totalCases.toLocaleString('en-IN')}</div>
                </div>
              </div>
            )}

            {/* Quick Demo Loader */}
            {totalCases === 0 && (
              <button
                onClick={onLoadSampleData}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#eb8a23] hover:bg-[#d97917] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition cursor-pointer"
                id="load-sample-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample MC Report</span>
              </button>
            )}

            {/* User Profile / Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 bg-[#1e293b] hover:bg-slate-800 text-slate-200 pl-3 pr-2.5 py-1.5 rounded-xl border border-slate-700/60 transition cursor-pointer text-xs"
                id="user-profile-menu-button"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-slate-400 leading-none capitalize font-semibold">{user?.role || 'Admin'}</p>
                  <p className="text-xs text-white font-bold leading-tight truncate max-w-[110px]">{user?.name || 'User'}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1e293b] border-2 border-[#eb8a23] flex items-center justify-center text-white font-bold text-xs shadow-inner">
                  {user?.avatar || 'U'}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-bold text-sm text-[#2d3e50]">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-[#eb8a23] font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Role: {user?.role.toUpperCase()}
                    </div>
                  </div>


                  <div className="border-t border-slate-100 mt-2 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Step Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none" id="main-nav-tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                id={`tab-${item.id}`}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#eb8a23] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      item.badgeColor || (isActive ? 'bg-white/30 text-white' : 'bg-slate-700 text-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
