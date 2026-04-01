import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../db/supabaseAdmin';
import config from '../config/env';
import { isStudentActive, resolveStudentStatus } from '../utils/studentStatus';

// Use JWT secret from centralized config - NEVER use a fallback in production
const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRY = config.jwtExpiresIn;

// Debug logging for JWT configuration
console.log('[AuthController] JWT Configuration:', {
  hasSecret: !!JWT_SECRET,
  secretLength: JWT_SECRET?.length || 0,
  secretPrefix: JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'none',
  expiry: JWT_EXPIRY,
  isProduction: process.env.NODE_ENV === 'production',
  safeMode: config.SAFE_MODE
});

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

/**
 * Build cookie options that work correctly on Railway (or any deployment where
 * HTTPS is terminated by a proxy before reaching the Node process).
 *
 * Railway always serves traffic over HTTPS, but `NODE_ENV` might not be
 * `'production'` in every environment. We therefore also inspect the
 * `X-Forwarded-Proto` header (set by Railway's proxy layer) to determine
 * whether the connection is secure.
 *
 * Rules:
 *   - `secure: true`  when NODE_ENV=production OR X-Forwarded-Proto=https
 *   - `sameSite: 'none'` only when `secure: true` (required by the spec)
 *   - `sameSite: 'lax'`  in plain-HTTP development environments
 */
function buildCookieOptions(req: Request): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'none';
  maxAge: number;
  path: string;
} {
  const isProductionEnv = process.env.NODE_ENV === 'production';
  const isHttps =
    isProductionEnv ||
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https';

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

// Admin Login
export const adminLogin = async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Fetch admin by email from the users table directly.
    // Querying the underlying table avoids "permission denied for view admins"
    // errors that can occur when the backward-compat view lacks explicit GRANTs.
    // We filter on the admin roles here to ensure non-admin users cannot log
    // in through this endpoint.
    console.log(`[Auth] Admin login attempt: ${email}`);
    const { data: admin, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .in('role', ['admin', 'super_admin', 'branch_admin'])
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Auth] Admin login - Database error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Database error occurred', 
        code: 'DB_ERROR',
        details: config.SAFE_MODE ? error.message : undefined 
      });
      return;
    }

    if (!admin || (error && error.code === 'PGRST116')) {
      console.log(`[Auth] Admin login - User not found: ${email}`);
      res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials', 
        code: 'USER_NOT_FOUND' 
      });
      return;
    }

    // Check that the admin account is active.  Treat NULL is_active as active
    // for backward-compatibility with rows that pre-date the column.
    if (admin.is_active === false || admin.status === 'INACTIVE' || admin.status === 'SUSPENDED') {
      console.log(`[Auth] Admin login - Account inactive/suspended: ${email}, status: ${admin.status}, is_active: ${admin.is_active}`);
      res.status(403).json({ 
        success: false, 
        error: 'Your account is inactive or suspended. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
      return;
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      console.log(`[Auth] Admin login - Invalid password for: ${email}`);
      res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials', 
        code: 'INVALID_PASSWORD' 
      });
      return;
    }

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Validate that the role stored in the database is one of the expected admin roles
    const validAdminRoles = ['admin', 'super_admin', 'branch_admin'] as const;
    type AdminRole = typeof validAdminRoles[number];
    if (!validAdminRoles.includes(admin.role as AdminRole)) {
      res.status(403).json({ success: false, error: 'Invalid account role' });
      return;
    }

    // Generate JWT – use the role stored in DB so super_admin and branch_admin
    // receive a token that reflects their actual role.
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role as AdminRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY } as jwt.SignOptions
    );

    // Determine cookie options based on environment / transport security
    const cookieOptions = buildCookieOptions(req);

    console.log('[Auth] Admin login successful - setting cookie with options:', {
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      tokenPrefix: token.substring(0, 20) + '...'
    });

    // Set httpOnly cookie
    res.cookie('token', token, cookieOptions);

    res.json({
      success: true,
      data: {
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          avatar_url: admin.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Student Login
export const studentLogin = async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Fetch student by email from the users table directly.
    // Querying the underlying table avoids "permission denied for view students"
    // errors that can occur when the backward-compat view lacks explicit GRANTs.
    // We filter on role = 'student' to ensure only student accounts can log in
    // through this endpoint.
    console.log(`[Auth] Student login attempt: ${email}`);
    const { data: student, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'student')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Auth] Student login - Database error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Database error occurred', 
        code: 'DB_ERROR',
        details: config.SAFE_MODE ? error.message : undefined 
      });
      return;
    }

    if (!student || (error && error.code === 'PGRST116')) {
      console.log(`[Auth] Student login - User not found: ${email}`);
      res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials', 
        code: 'USER_NOT_FOUND' 
      });
      return;
    }

    // Support both new 'status' column and legacy 'is_active' boolean
    if (!isStudentActive(student)) {
      const effectiveStatus = resolveStudentStatus(student);
      console.log(`[Auth] Student login - Account inactive/suspended: ${email}, effectiveStatus: ${effectiveStatus}`);
      const message =
        effectiveStatus === 'SUSPENDED'
          ? 'Your account has been suspended. Please contact your institution.'
          : 'Your account is inactive. Please contact your institution.';
      res.status(403).json({ 
        success: false, 
        error: message, 
        code: 'ACCOUNT_INACTIVE' 
      });
      return;
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, student.password_hash);

    if (!isValidPassword) {
      console.log(`[Auth] Student login - Invalid password for: ${email}`);
      res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials', 
        code: 'INVALID_PASSWORD' 
      });
      return;
    }

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', student.id);

    // Generate JWT
    const token = jwt.sign(
      { id: student.id, email: student.email, role: 'student' as const },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY } as jwt.SignOptions
    );

    // Determine cookie options based on environment / transport security
    const cookieOptions = buildCookieOptions(req);

    console.log('[Auth] Student login successful - setting cookie with options:', {
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      tokenPrefix: token.substring(0, 20) + '...'
    });

    // Set httpOnly cookie
    res.cookie('token', token, cookieOptions);

    res.json({
      success: true,
      data: {
        user: {
          id: student.id,
          name: student.name,
          email: student.email,
          role: 'student',
          course_id: student.course_id,
          avatar_url: student.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Logout
export const logout = (req: Request, res: Response): void => {
  // Cookie options must match those used at login time
  const cookieOptions = buildCookieOptions(req);

  console.log('[Auth] Logout - clearing cookie with options:', {
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  });

  res.clearCookie('token', cookieOptions);
  res.json({ success: true, message: 'Logged out successfully' });
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    console.log('[Auth] getCurrentUser called - user from auth middleware:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      hasCookieToken: !!req.cookies?.token,
      cookieTokenPrefix: req.cookies?.token?.substring(0, 20) + '...'
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    let userData;
    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'branch_admin') {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role, avatar_url')
        .eq('id', user.id)
        .in('role', ['admin', 'super_admin', 'branch_admin'])
        .single();

      if (error || !data) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      userData = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role, course_id, avatar_url')
        .eq('id', user.id)
        .eq('role', 'student')
        .single();

      if (error || !data) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      userData = data;
    }

    res.json({ success: true, data: { user: userData } });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Always return success message for security (don't reveal if email exists)
    res.json({
      success: true,
      message: 'If this email exists, a reset link has been sent.',
    });

    // In production, you would:
    // 1. Check if email exists
    // 2. Generate a reset token
    // 3. Send email with reset link
    // For now, we just return success
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};