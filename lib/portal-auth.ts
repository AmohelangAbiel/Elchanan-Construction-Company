import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { PORTAL_COOKIE_NAME } from './constants';
import { logInfo, logWarn } from './logger';
import { prisma } from './prisma';

type PortalTokenPayload = {
  userId: string;
  email: string;
  sessionVersion: number;
};

export type PortalSession = {
  userId: string;
  email: string;
  fullName: string;
  displayName: string | null;
  leadId: string | null;
  sessionVersion: number;
};

const PORTAL_TOKEN_MAX_AGE = 8 * 60 * 60;

function getPortalSecret() {
  const secret = process.env.PORTAL_SECRET;

  if (!secret || secret === 'replace-with-a-strong-secret') {
    throw new Error('PORTAL_SECRET must be set to a strong value before using portal authentication.');
  }

  return secret;
}

export function hashPortalPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPortalPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function createPortalToken(payload: PortalTokenPayload) {
  return jwt.sign(payload, getPortalSecret(), { expiresIn: '8h' });
}

export function verifyPortalToken(token: string) {
  try {
    return jwt.verify(token, getPortalSecret()) as PortalTokenPayload;
  } catch {
    return null;
  }
}

async function verifyActivePortalSession(token: string | undefined) {
  if (!token) return null;

  const payload = verifyPortalToken(token);
  if (!payload) return null;

  const clientUser = await prisma.clientUser.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      displayName: true,
      leadId: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!clientUser || !clientUser.isActive) {
    logWarn('portal.session_rejected_inactive_or_missing', { userId: payload.userId });
    return null;
  }

  if (clientUser.email.toLowerCase() !== payload.email.toLowerCase()) {
    logWarn('portal.session_rejected_email_mismatch', { userId: payload.userId });
    return null;
  }

  if (clientUser.sessionVersion !== payload.sessionVersion) {
    logWarn('portal.session_rejected_version_mismatch', {
      userId: payload.userId,
      tokenSessionVersion: payload.sessionVersion,
      dbSessionVersion: clientUser.sessionVersion,
    });
    return null;
  }

  return {
    userId: clientUser.id,
    email: clientUser.email,
    fullName: clientUser.fullName,
    displayName: clientUser.displayName,
    leadId: clientUser.leadId,
    sessionVersion: clientUser.sessionVersion,
  } satisfies PortalSession;
}

export async function revokePortalSessions(userId: string) {
  const updated = await prisma.clientUser.update({
    where: { id: userId },
    data: {
      sessionVersion: {
        increment: 1,
      },
    },
    select: { sessionVersion: true },
  });

  logInfo('portal.sessions_revoked', {
    userId,
    newSessionVersion: updated.sessionVersion,
  });

  return updated.sessionVersion;
}

export function setPortalCookie(response: NextResponse, token: string) {
  const expires = new Date(Date.now() + PORTAL_TOKEN_MAX_AGE * 1000);

  response.cookies.set({
    name: PORTAL_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: PORTAL_TOKEN_MAX_AGE,
    expires,
    priority: 'high',
  });
}

export function clearPortalCookie(response: NextResponse) {
  response.cookies.set({
    name: PORTAL_COOKIE_NAME,
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

export async function getPortalSession() {
  const storedToken = cookies().get(PORTAL_COOKIE_NAME)?.value;
  return verifyActivePortalSession(storedToken);
}

export async function requirePortalSession() {
  const session = await getPortalSession();
  if (!session) {
    redirect('/portal/login');
  }

  return session;
}

export async function requirePortalAuth() {
  const storedToken = cookies().get(PORTAL_COOKIE_NAME)?.value;
  return verifyActivePortalSession(storedToken);
}
