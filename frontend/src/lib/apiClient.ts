import axios from 'axios';

// In production the Next.js server proxies /api/* to the backend via the
// rewrites configured in next.config.js.  The browser therefore only ever
// makes same-origin requests, which avoids CORS and mixed-content issues.
// NEXT_PUBLIC_API_URL can still be overridden explicitly (e.g. for local
// development without the proxy), but the default is now the relative path.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Paths that are themselves login pages — the 401 interceptor must not redirect
// here, otherwise refreshUser() on mount would trigger an infinite reload loop.
const LOGIN_ROUTES = ['/login', '/admin/login', '/super-admin/login'];

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // Prevent the browser and CDN from serving stale API responses (304 issues)
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// Response interceptor — handle 401 by redirecting to the correct login page
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const isOnLoginPage = LOGIN_ROUTES.includes(currentPath);
      if (!isOnLoginPage) {
        if (currentPath.startsWith('/admin') || currentPath.startsWith('/super-admin')) {
          window.location.href = '/admin/login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;