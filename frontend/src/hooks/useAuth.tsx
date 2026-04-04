'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/lib/apiClient';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | 'super_admin' | 'branch_admin';
  course_id?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: 'admin' | 'student') => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserAvatar: (url: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const freshUser = response.data.data?.user;
      if (freshUser) {
        setUser(freshUser);
      }
    } catch (error: any) {
      // Only clear user state on genuine authentication failure (401).
      // Transient errors (network, 500, etc.) must not log the user out.
      if (error?.response?.status === 401) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, role: 'admin' | 'student') => {
    try {
      const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/student/login';
      const response = await apiClient.post(endpoint, { email, password });
      const loggedInUser = response.data.data?.user ?? null;
      setUser(loggedInUser);

      // Verify the session cookie is usable by calling /auth/me.
      // This guards against the case where the cookie is set in the login
      // response but not correctly stored or forwarded by the browser/proxy,
      // which would cause a redirect loop after the page navigates.
      try {
        const meResponse = await apiClient.get('/auth/me');
        const verifiedUser = meResponse.data.data?.user ?? null;
        setUser(verifiedUser);
        return verifiedUser;
      } catch {
        // Fall back to the user data from the login response so the caller
        // can still redirect; the session might still work for the redirect
        // target's own /auth/me check.
        return loggedInUser;
      }
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    await apiClient.post('/auth/logout');
    setUser(null);
  };

  const updateUserAvatar = useCallback((url: string) => {
    setUser((prev) => (prev ? { ...prev, avatar_url: url } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, updateUserAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;