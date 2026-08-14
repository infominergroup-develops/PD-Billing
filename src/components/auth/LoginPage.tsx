import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InfominerLogo } from '../common/InfominerLogo';
import { Lock, Mail, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { DEMO_USERS } from '../../constants/defaultData';
import { UserRole } from '../../types';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#1e293b] via-[#2d3e50] to-[#1e293b] flex items-center justify-center p-4 sm:p-6"
      id="login-page-container"
    >
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Card */}
        <div className="bg-[#2d3e50] p-8 text-center text-white border-b border-slate-700 relative">
          <div className="flex justify-center mb-2">
            <InfominerLogo size="lg" variant="light" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white mt-3">
            PD Billing &amp; Verification Automation
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Enterprise Financial Reconciliation &amp; Audit Portal
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#eb8a23] focus:ring-1 focus:ring-[#eb8a23] font-medium"
                  placeholder="admin@infominer.in"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#eb8a23] focus:ring-1 focus:ring-[#eb8a23] font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-[#eb8a23] hover:bg-[#d97917] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              id="login-submit-button"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Infominer Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Infominer Internal Security Encrypted Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};
