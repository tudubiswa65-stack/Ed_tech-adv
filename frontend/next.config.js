/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Proxy all /api/* requests from the browser through the Next.js server to
  // the backend.  This avoids cross-origin (CORS) and mixed-content issues in
  // production where the frontend is served over HTTPS and the backend lives on
  // a separate domain.
  async rewrites() {
    let backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

    // Serve the public landing page (edupro.html) at the root URL.
    // All internal routes (login, admin, dashboard) are accessible only via their specific paths.
    const landingPageRewrite = { source: '/', destination: '/edupro.html' };

    // In production, Railway (and most PaaS providers) enforce HTTPS and will
    // issue a 301 redirect for plain-HTTP requests.  A 301 causes HTTP clients
    // to follow the redirect with GET, which turns a POST into a GET and breaks
    // login routes.  Coerce any http:// backend URL to https:// in production
    // so that the proxy never sends a plain-HTTP request in the first place.
    if (process.env.NODE_ENV === 'production' && backendUrl.startsWith('http://')) {
      console.warn(
        '[next.config.js] BACKEND_URL is using HTTP in production — coercing to HTTPS to prevent 301 redirect issues. Set BACKEND_URL=https://... to suppress this warning.'
      );
      backendUrl = backendUrl.replace('http://', 'https://');
    }

    return [
      landingPageRewrite,
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;