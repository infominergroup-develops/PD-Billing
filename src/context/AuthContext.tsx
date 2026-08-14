import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../constants/defaultData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('infominer_auth_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('infominer_auth_v2', JSON.stringify(user));
    } else {
      localStorage.removeItem('infominer_auth_v2');
    }
  }, [user]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const userData = await response.json();

      const authenticatedUser: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: userData.email.slice(0, 2).toUpperCase(),
        lastLogin: new Date().toISOString(),
      };

      setUser(authenticatedUser);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const switchUser = (role: UserRole) => {
    // Disabled in real backend mode to prevent unauthorized role switching
    console.warn('Switch user is disabled in production.');
  };

  const logout = () => {
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || isAdmin;
  const isAuditor = user?.role === 'auditor';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
