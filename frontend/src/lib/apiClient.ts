import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

console.log('[ApiClient] >>> STEP X: Initializing with API_URL:', API_URL);
console.log('[ApiClient] STEP Xb: NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL);

// Validate API_URL at runtime
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[ApiClient] WARNING: NEXT_PUBLIC_API_URL not set, falling back to:', API_URL);
}

if (typeof window !== 'undefined') {
  console.log('[ApiClient] STEP Xc: Running in browser, window defined');
  console.log('[ApiClient] STEP Xd: Current location:', window.location.href);
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('[ApiClient Request] STEP REQ1: Request interceptor firing');
    console.log('[ApiClient Request] STEP REQ2: Full URL:', `${config.baseURL}${config.url}`);
    console.log('[ApiClient Request] STEP REQ3: Method:', config.method?.toUpperCase());
    console.log('[ApiClient Request] STEP REQ4: Headers:', JSON.stringify(config.headers));
    console.log('[ApiClient Request] STEP REQ5: Data:', config.data);
    console.log('[ApiClient Request] STEP REQ6: withCredentials:', config.withCredentials);
    console.log('[ApiClient Request] STEP REQ7: baseURL:', config.baseURL);
    return config;
  },
  (error) => {
    console.error('[ApiClient Request Error] STEP REQ_ERR1: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('[ApiClient Response Success] STEP RES1: Response interceptor success');
    console.log('[ApiClient Response Success] STEP RES2: Full URL:', `${response.config.baseURL}${response.config.url}`);
    console.log('[ApiClient Response Success] STEP RES3: Status:', response.status, response.statusText);
    console.log('[ApiClient Response Success] STEP RES4: Data:', response.data);
    return response;
  },
  (error) => {
    console.error('[ApiClient Response Error] STEP ERR1: Response error interceptor');
    console.error('[ApiClient Response Error] STEP ERR2: Error message:', error.message);
    console.error('[ApiClient Response Error] STEP ERR3: Error code:', error.code);
    console.error('[ApiClient Response Error] STEP ERR4: Response status:', error.response?.status);
    console.error('[ApiClient Response Error] STEP ERR5: Response data:', error.response?.data);
    console.error('[ApiClient Response Error] STEP ERR6: Config URL:', error.config ? `${error.config.baseURL}${error.config.url}` : 'N/A');
    console.error('[ApiClient Response Error] STEP ERR7: Is axios error:', axios.isAxiosError(error));
    console.error('[ApiClient Response Error] STEP ERR8: Has response:', !!error.response);
    console.error('[ApiClient Response Error] STEP ERR9: Has request:', !!error.request);

    if (error.response?.status === 401) {
      console.log('[ApiClient] STEP ERR10: 401 Unauthorized detected');
      // Redirect to login if not authenticated
      if (typeof window !== 'undefined') {
        console.log('[ApiClient] STEP ERR11: 401 Unauthorized, redirecting to login');
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else if (!currentPath.includes('/login')) {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

console.log('[ApiClient] >>> STEP Y: apiClient fully initialized');

export default apiClient;