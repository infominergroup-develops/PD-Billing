import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** True until the server has confirmed (or rejected) the existing session cookie. */
  isCheckingSession: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (role: UserRole) => void;
  isAdmin: boolean;
  isManager: boolean;
  isAuditor: boolean;
  canEditRecords: boolean;
  canEditRates: boolean;
  canGenerateInvoices: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Fired by API helpers when the server answers 401, so the UI returns to the login screen. */
export const SESSION_EXPIRED_EVENT = 'pd:session-expired';

const toUser = (u: { id: string; name: string; email: string; role: UserRole }): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  avatar: u.email.slice(0, 2).toUpperCase(),
  lastLogin: new Date().toISOString(),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The session is an HttpOnly cookie the browser script cannot read or forge;
  // the user object here is only a display copy of what the server confirmed.
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    localStorage.removeItem('infominer_auth_v2'); // legacy, client-trusted login record
    let cancelled = false;
    fetch('/api/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => !cancelled && setUser(u ? toUser(u) : null))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setIsCheckingSession(false));

    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Login failed');
    setUser(toUser(data));
    return true;
  };

  const switchUser = (_role: UserRole) => {
    console.warn('Switch user is disabled: roles come from the server session.');
  };

  const logout = () => {
    setUser(null);
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(
      () => {}
    );
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || isAdmin;
  const isAuditor = user?.role === 'auditor';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isCheckingSession,
        login,
        logout,
        switchUser,
        isAdmin,
        isManager,
        isAuditor,
        canEditRecords: isAdmin,
        canEditRates: isManager,
        canGenerateInvoices: isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
