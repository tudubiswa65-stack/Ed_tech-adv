export type UserRole = 'student' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
}

export interface AdminUser extends User {
  role: 'admin' | 'super_admin';
}

export interface StudentUser extends User {
  role: 'student';
  course_id?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  instituteId?: string;
  iat?: number;
  exp?: number;
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: JWTPayload;
  cookies: {
    token?: string;
    [key: string]: any;
  };
}