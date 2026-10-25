import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserSession } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: UserSession | null;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; role?: 'student' | 'admin'; error?: string }>;
  register: (rollNumber: string, name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SESSION_KEY = 'college_portal_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem(USER_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_SESSION_KEY);
      }
    } catch (err) {
      console.error('Failed to sync auth session:', err);
    }
  }, [user]);

  const login = async (
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; role?: 'student' | 'admin'; error?: string }> => {
    const res = await authApi.login(identifier, pass);
    if (res.success && res.user) {
      setUser(res.user);
      return { success: true, role: res.user.role };
    }
    return { success: false, error: res.error || 'Login failed.' };
  };

  const register = async (
    rollNumber: string,
    name: string,
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await authApi.register(rollNumber, name, email, pass);
    if (res.success && res.user) {
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Registration failed.' };
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
