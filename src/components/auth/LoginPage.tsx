import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { InfominerLogo } from '../common/InfominerLogo';
import { Lock, Mail, ShieldCheck, ArrowRight, Eye, EyeOff, Loader2, FileSpreadsheet, Calculator, FileCheck2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  { icon: FileSpreadsheet, title: 'Upload MC reports', body: 'Every activity row counted exactly — with a full row-by-row breakdown.' },
  { icon: Calculator, title: 'Rate sheets applied automatically', body: 'Flat and KM-slab rates matched per client, branch and state.' },
  { icon: FileCheck2, title: 'Invoices & audit trail', body: 'GST invoices, exports and a tamper-evident log of every change.' },
];

/** Three floating panels echoing the logo mark. Purely decorative. */
const BrandPanels: React.FC = () => (
  <div className="pointer-events-none absolute -bottom-28 -right-16 z-0 h-[360px] w-[330px]" aria-hidden>
    {[
      { color: '#F2B544', x: 0, y: 0, delay: 0 },
      { color: '#E86B2E', x: 64, y: 40, delay: 0.08 },
      { color: '#4F6680', x: 128, y: 80, delay: 0.16 },
    ].map((p, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: i === 2 ? 0.7 : 0.9, x: 0 }}
        transition={{ duration: 0.9, delay: 0.2 + p.delay, ease }}
        className="absolute h-[230px] w-[180px] animate-float"
        style={{
          left: p.x,
          top: p.y,
          background: p.color,
          clipPath: 'polygon(0 26%, 100% 0, 100% 74%, 0 100%)',
          animationDelay: `${i * -2}s`,
        }}
      />
    ))}
  </div>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const inputCls =
    'h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-ink-900 shadow-xs placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15';

  return (
    <div className="flex min-h-screen bg-canvas" id="login-page-container">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] max-w-[640px] overflow-hidden bg-ink-900 text-white lg:flex lg:flex-col lg:justify-between p-12">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
          aria-hidden
        />
        <BrandPanels />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="relative z-10"
        >
          <InfominerLogo size="lg" variant="light" />
        </motion.div>

        <div className="relative z-10 max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="text-[2.1rem] font-bold leading-tight tracking-tight"
          >
            PD billing, reconciled
            <br />
            <span className="text-brand-400">to the last case.</span>
          </motion.h1>
          <ul className="mt-10 space-y-5">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.25 + i * 0.08, ease }}
                className="flex gap-3.5"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <f.icon className="h-4 w-4 text-brand-300" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{f.title}</span>
                  <span className="block text-sm text-ink-200">{f.body}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-ink-300">© {new Date().getFullYear()} Infominers Group · Internal use only</p>
      </aside>

      {/* Sign-in form */}
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-10 lg:hidden">
            <InfominerLogo size="lg" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-ink-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">Use your Infominer administrator or manager account.</p>

          {errorMsg && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 0.4 }}
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {errorMsg}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink-800">
                Work email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="you@infominer.in"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-ink-800">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
              id="login-submit-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Secure session · signed out automatically after 8 hours
          </div>
        </motion.div>
      </main>
    </div>
  );
};
