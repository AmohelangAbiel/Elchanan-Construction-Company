import { NextResponse } from 'next/server';
import { extractRequestIp, hashIp } from './sanitize';

type JsonResponseOptions = {
  requestId?: string;
  headers?: HeadersInit;
};

function withResponseHeaders(options?: JsonResponseOptions) {
  const headers = new Headers(options?.headers);
  if (options?.requestId) {
    headers.set('x-request-id', options.requestId);
  }
  return headers;
}

export function jsonError(message: string, status = 400, details?: unknown, options?: JsonResponseOptions) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status, headers: withResponseHeaders(options) },
  );
}

export function jsonSuccess<T extends Record<string, unknown>>(payload: T, status = 200, options?: JsonResponseOptions) {
  return NextResponse.json(
    {
      success: true,
      ...payload,
    },
    { status, headers: withResponseHeaders(options) },
  );
}

export function getRequesterMetadata(request: Request) {
  const ip = extractRequestIp(request.headers);
  const userAgent = request.headers.get('user-agent');

  return {
    sourceIpHash: hashIp(ip),
    userAgent: userAgent ? userAgent.slice(0, 400) : null,
  };
}

export function formDataToObject(formData: FormData) {
  const object: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    object[key] = typeof value === 'string' ? value : '';
  }

  return object;
}

export function assertSameOrigin(request: Request): boolean {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const expectedHost = (forwardedHost || request.headers.get('host') || requestUrl.host)
    .split(',')[0]
    .trim();
  const expectedProto = (forwardedProto || requestUrl.protocol.replace(':', ''))
    .split(',')[0]
    .trim();

  function matchesExpected(url: URL) {
    return url.host === expectedHost && url.protocol === `${expectedProto}:`;
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return matchesExpected(new URL(origin));
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return matchesExpected(new URL(referer));
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) {
    return fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none';
  }

  return process.env.NODE_ENV !== 'production';
}

export function safeRedirectPath(
  candidate: unknown,
  fallback: string,
  allowedPrefixes: string[] = ['/admin'],
) {
  if (typeof candidate !== 'string') return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;

  const allowed = allowedPrefixes.some((prefix) => (
    candidate === prefix ||
    candidate.startsWith(`${prefix}/`) ||
    candidate.startsWith(`${prefix}?`)
  ));

  return allowed ? candidate : fallback;
}

export function isRequestBodyWithinLimit(request: Request, maxBytes: number): boolean {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return true;

  const parsed = Number(contentLength);
  if (!Number.isFinite(parsed) || parsed < 0) return false;

  return parsed <= maxBytes;
}

export function getRequestId(request: Request) {
  const fromHeader = request.headers.get('x-request-id')?.trim();
  if (fromHeader && fromHeader.length <= 120) {
    return fromHeader;
  }

  const randomPart = Math.random().toString(16).slice(2, 10);
  return `req_${Date.now().toString(36)}_${randomPart}`;
}
