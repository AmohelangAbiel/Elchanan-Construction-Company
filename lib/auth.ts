import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from './constants';
import { prisma } from './prisma';
import { logInfo, logWarn } from './logger';

type AdminTokenPayload = {
  userId: string;
  email: string;
  sessionVersion: number;
};

export type AdminSession = {
  userId: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
};

const ADMIN_TOKEN_MAX_AGE = 8 * 60 * 60;

function getAdminSecret() {
  const secret = process.env.ADMIN_SECRET;

  if (!secret || secret === 'replace-with-a-strong-secret') {
    throw new Error('ADMIN_SECRET must be set to a strong value before using admin authentication.');
  }

  return secret;
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function createAdminToken(payload: AdminTokenPayload) {
  return jwt.sign(payload, getAdminSecret(), { expiresIn: '8h' });
}

export function verifyAdminToken(token: string) {
  try {
    return jwt.verify(token, getAdminSecret()) as AdminTokenPayload;
  } catch {
    return null;
  }
}

async function verifyActiveAdminSession(token: string | undefined) {
  if (!token) return null;

  const payload = verifyAdminToken(token);
  if (!payload) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, isActive: true, sessionVersion: true },
  });

  if (!admin || !admin.isActive) {
    logWarn('auth.session_rejected_inactive_or_missing', { userId: payload.userId });
    return null;
  }

  if (admin.email.toLowerCase() !== payload.email.toLowerCase()) {
    logWarn('auth.session_rejected_email_mismatch', { userId: payload.userId });
    return null;
  }

  if (admin.sessionVersion !== payload.sessionVersion) {
    logWarn('auth.session_rejected_version_mismatch', {
      userId: payload.userId,
      tokenSessionVersion: payload.sessionVersion,
      dbSessionVersion: admin.sessionVersion,
    });
    return null;
  }

  return {
    userId: admin.id,
    email: admin.email,
    role: admin.role,
    sessionVersion: admin.sessionVersion,
  };
}

export function hasAnyAdminRole(role: UserRole, allowedRoles: UserRole[]) {
  if (!allowedRoles.length) return true;
  if (role === 'SUPER_ADMIN') return true;
  return allowedRoles.includes(role);
}

export async function revokeAdminSessions(userId: string) {
  const updated = await prisma.adminUser.update({
    where: { id: userId },
    data: {
      sessionVersion: {
        increment: 1,
      },
    },
    select: { sessionVersion: true },
  });

  logInfo('auth.sessions_revoked', {
    userId,
    newSessionVersion: updated.sessionVersion,
  });

  return updated.sessionVersion;
}

export function setAdminCookie(response: NextResponse, token: string) {
  const expires = new Date(Date.now() + ADMIN_TOKEN_MAX_AGE * 1000);

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_TOKEN_MAX_AGE,
    expires,
    priority: 'high',
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    priority: 'high',
  });
}

export async function getAdminSession() {
  const storedToken = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verifyActiveAdminSession(storedToken);
}

export async function requireAdminSession(allowedRoles: UserRole[] = []) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  if (!hasAnyAdminRole(session.role, allowedRoles)) {
    redirect('/admin?forbidden=1');
  }

  return session;
}

export async function requireAdminAuth() {
  const storedToken = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verifyActiveAdminSession(storedToken);
}
