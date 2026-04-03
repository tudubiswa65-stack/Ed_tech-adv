import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Internal system route protection.
 *
 * Rules:
 *  1. Authenticated users (valid `token` cookie) → full access to all
 *     internal routes.
 *  2. Unauthenticated users visiting a login page WITH the correct
 *     `?access=<ADMIN_ACCESS_TOKEN>` query parameter → allowed through so
 *     they can sign in.
 *  3. Every other unauthenticated request to an internal path → 404.
 *     This makes the admin / super-admin system invisible to anyone who
 *     doesn't already know both the URL *and* the secret access token.
 *
 * Usage (share only with authorised staff):
 *   https://<your-domain>/admin/login?access=<ADMIN_ACCESS_TOKEN>
 *   https://<your-domain>/super-admin/login?access=<ADMIN_ACCESS_TOKEN>
 *
 * If ADMIN_ACCESS_TOKEN is not set the login pages remain open — useful
 * during local development / initial setup.
 */

// Secret token required to reach the login pages.
// This middleware runs in the Next.js Edge runtime (server-side), so it has
// full access to non-NEXT_PUBLIC_ environment variables at runtime.
// Never commit the real value — set it in your hosting platform's env config.
const ADMIN_ACCESS_TOKEN = process.env.ADMIN_ACCESS_TOKEN ?? '';

// Route prefixes that belong to the internal system.
const INTERNAL_PREFIXES = ['/admin', '/super-admin'] as const;

// Exact login page paths within each internal prefix.
const LOGIN_PATHS = ['/admin/login', '/super-admin/login'] as const;

/**
 * Constant-time string comparison to prevent timing attacks.
 * Works in the Edge runtime (no Node.js crypto required).
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  // Always iterate over the full length of both inputs so response time does
  // not leak information about where the strings first differ.
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let mismatch = aBytes.length === bBytes.length ? 0 : 1;

  for (let i = 0; i < maxLen; i++) {
    const aByte = i < aBytes.length ? aBytes[i] : 0;
    const bByte = i < bBytes.length ? bBytes[i] : 0;
    mismatch |= aByte ^ bByte;
  }

  return mismatch === 0;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  // Only handle paths that belong to the internal system.
  const isInternal = INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!isInternal) {
    return NextResponse.next();
  }

  // Authenticated users (backend sets an HTTP-only `token` cookie on login)
  // have full access to all internal routes.
  const authCookie = request.cookies.get('token');
  if (authCookie?.value) {
    return NextResponse.next();
  }

  // Unauthenticated access to an exact login page:
  // Allow only when the caller supplies the correct secret access token.
  const isLoginPage = LOGIN_PATHS.some((p) => pathname === p);
  if (isLoginPage) {
    // If no token is configured (e.g. local dev), allow open access.
    if (!ADMIN_ACCESS_TOKEN) {
      return NextResponse.next();
    }
    const provided = searchParams.get('access') ?? '';
    if (timingSafeEqual(provided, ADMIN_ACCESS_TOKEN)) {
      return NextResponse.next();
    }
  }

  // Everything else → 404.
  // Returning a blank 404 (rather than a redirect to /login) ensures the
  // internal system is completely invisible to the public.
  return new NextResponse(null, { status: 404 });
}

export const config = {
  // Run this middleware on all admin and super-admin paths.
  matcher: ['/admin/:path*', '/super-admin/:path*'],
};
