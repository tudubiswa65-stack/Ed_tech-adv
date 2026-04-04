'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/lib/apiClient';
import { getCachedAvatar, setCachedAvatar, clearCachedAvatar } from '@/lib/avatarCache';

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
        // Read the currently cached URL before overwriting it.
        const cachedUrl = getCachedAvatar(freshUser.id);
        // Always refresh the cache with the latest signed URL from the backend
        // so that avatar changes made on another device are reflected within
        // the next page load rather than waiting for the TTL to expire.
        if (freshUser.avatar_url) {
          setCachedAvatar(freshUser.id, freshUser.avatar_url);
        }
        // For this render, prefer the previously cached URL when still valid
        // so the browser can serve the image from its HTTP cache (stable URL).
        setUser({ ...freshUser, avatar_url: cachedUrl ?? freshUser.avatar_url });
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
    if (user?.id) {
      clearCachedAvatar(user.id);
    }
    await apiClient.post('/auth/logout');
    setUser(null);
  };

  const updateUserAvatar = useCallback((url: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      // Clear the stale cache and store the new signed URL so subsequent page
      // loads reuse this URL for the full 50-minute window.
      clearCachedAvatar(prev.id);
      setCachedAvatar(prev.id, url);
      return { ...prev, avatar_url: url };
    });
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