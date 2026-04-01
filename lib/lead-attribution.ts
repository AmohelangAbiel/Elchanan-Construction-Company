import type { LeadSourceType } from '@prisma/client';

const MAX_URL_LENGTH = 2048;
const MAX_TEXT_SHORT = 160;

const leadSourceTypeSet = new Set<LeadSourceType>([
  'DIRECT',
  'CONTACT_PAGE',
  'QUOTE_PAGE',
  'SERVICE_PAGE',
  'PROJECT_PAGE',
  'WHATSAPP',
  'FORUM_PAGE',
  'OTHER',
]);

type LeadAttributionInput = {
  leadSourceType?: string | null;
  sourcePath?: string | null;
  sourcePage?: string | null;
  sourceReferrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

export type LeadAttribution = {
  sourceType: LeadSourceType;
  sourcePath: string | null;
  sourcePage: string | null;
  sourceReferrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

function cleanText(value: string | null | undefined, max: number) {
  if (!value) return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.slice(0, max);
}

function normalizePathLike(value: string | null | undefined) {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  if (raw.startsWith('/')) {
    return raw.slice(0, MAX_URL_LENGTH);
  }

  try {
    const url = new URL(raw);
    return `${url.pathname}${url.search}`.slice(0, MAX_URL_LENGTH);
  } catch {
    return null;
  }
}

function normalizeReferrer(value: string | null | undefined) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return url.toString().slice(0, MAX_URL_LENGTH);
  } catch {
    return null;
  }
}

function inferLeadSourceType(path: string | null, referrer: string | null): LeadSourceType {
  if (path?.startsWith('/contact')) return 'CONTACT_PAGE';
  if (path?.startsWith('/quote')) return 'QUOTE_PAGE';
  if (path?.startsWith('/services')) return 'SERVICE_PAGE';
  if (path?.startsWith('/projects')) return 'PROJECT_PAGE';
  if (path?.startsWith('/forum')) return 'FORUM_PAGE';

  if (referrer) {
    if (referrer.includes('wa.me') || referrer.includes('whatsapp.com')) return 'WHATSAPP';
    return 'OTHER';
  }

  return 'DIRECT';
}

function extractUtmValue(sourcePath: string | null, key: string) {
  if (!sourcePath) return null;

  try {
    const url = sourcePath.startsWith('/')
      ? new URL(sourcePath, 'https://elchananconstruction.local')
      : new URL(sourcePath);
    const value = url.searchParams.get(key);
    return cleanText(value, MAX_TEXT_SHORT);
  } catch {
    return null;
  }
}

export function getLeadAttribution(input: LeadAttributionInput, request: Request): LeadAttribution {
  const refererHeader = request.headers.get('referer');

  const sourcePath = normalizePathLike(input.sourcePath) || normalizePathLike(input.sourcePage);
  const sourcePage = normalizePathLike(input.sourcePage) || (sourcePath ? sourcePath.split('?')[0] : null);
  const sourceReferrer = normalizeReferrer(input.sourceReferrer) || normalizeReferrer(refererHeader);

  const parsedSourceType = cleanText(input.leadSourceType, 40);
  const sourceType = parsedSourceType && leadSourceTypeSet.has(parsedSourceType as LeadSourceType)
    ? (parsedSourceType as LeadSourceType)
    : inferLeadSourceType(sourcePage, sourceReferrer);

  const utmSource = cleanText(input.utmSource, MAX_TEXT_SHORT) || extractUtmValue(sourcePath, 'utm_source');
  const utmMedium = cleanText(input.utmMedium, MAX_TEXT_SHORT) || extractUtmValue(sourcePath, 'utm_medium');
  const utmCampaign = cleanText(input.utmCampaign, MAX_TEXT_SHORT) || extractUtmValue(sourcePath, 'utm_campaign');

  return {
    sourceType,
    sourcePath,
    sourcePage,
    sourceReferrer,
    utmSource,
    utmMedium,
    utmCampaign,
  };
}
