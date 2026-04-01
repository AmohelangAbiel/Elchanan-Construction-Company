import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { sanitizeText } from './sanitize';

export type MediaUploadKind = 'project' | 'service' | 'quote' | 'general';

export type SavedMediaFile = {
  originalName: string;
  safeFileName: string;
  mimeType: string;
  bytes: number;
  publicUrl: string;
  storagePath: string;
  kind: MediaUploadKind;
};

type KindRules = {
  maxBytes: number;
  allowedMimeTypes: string[];
};

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

const KIND_RULES: Record<MediaUploadKind, KindRules> = {
  project: {
    maxBytes: 8 * 1024 * 1024,
    allowedMimeTypes: IMAGE_MIME_TYPES,
  },
  service: {
    maxBytes: 8 * 1024 * 1024,
    allowedMimeTypes: IMAGE_MIME_TYPES,
  },
  quote: {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: [...IMAGE_MIME_TYPES, 'application/pdf'],
  },
  general: {
    maxBytes: 8 * 1024 * 1024,
    allowedMimeTypes: IMAGE_MIME_TYPES,
  },
};

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
};

function getUploadRoot() {
  const configured = process.env.LOCAL_MEDIA_UPLOAD_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  return path.join(process.cwd(), 'public', 'uploads');
}

function getPublicUrl(kind: MediaUploadKind, safeFileName: string) {
  return `/uploads/${kind}/${safeFileName}`;
}

function getStoragePath(kind: MediaUploadKind, safeFileName: string) {
  return path.posix.join('uploads', kind, safeFileName);
}

function sanitizeBaseName(input: string) {
  return sanitizeText(input, 120)
    .toLowerCase()
    .replace(/[^a-z0-9\-_. ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .slice(0, 80) || 'asset';
}

function resolveExtension(fileName: string, mimeType: string) {
  const mapped = MIME_EXTENSION_MAP[mimeType];
  if (mapped) return mapped;

  const extFromName = path.extname(fileName || '').toLowerCase();
  if (extFromName && /^[.][a-z0-9]{2,8}$/.test(extFromName)) {
    return extFromName;
  }

  return '.bin';
}

function createSafeFileName(originalName: string, mimeType: string) {
  const ext = resolveExtension(originalName, mimeType);
  const baseName = sanitizeBaseName(path.basename(originalName, path.extname(originalName)));
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const random = crypto.randomBytes(4).toString('hex');
  return `${baseName}-${stamp}-${random}${ext}`;
}

function getRules(kind: MediaUploadKind) {
  return KIND_RULES[kind] || KIND_RULES.general;
}

export function normalizeUploadKind(value: unknown): MediaUploadKind {
  const sanitized = sanitizeText(value, 24).toLowerCase();
  if (sanitized === 'project' || sanitized === 'service' || sanitized === 'quote' || sanitized === 'general') {
    return sanitized;
  }
  return 'general';
}

export async function saveMediaFile(file: File, kind: MediaUploadKind): Promise<SavedMediaFile> {
  const rules = getRules(kind);
  const mimeType = sanitizeText(file.type, 120).toLowerCase();

  if (!rules.allowedMimeTypes.includes(mimeType)) {
    throw new Error('Unsupported file type for this upload category.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = arrayBuffer.byteLength;

  if (bytes <= 0) {
    throw new Error('Uploaded file is empty.');
  }

  if (bytes > rules.maxBytes) {
    throw new Error('Uploaded file exceeds the allowed size.');
  }

  const safeFileName = createSafeFileName(file.name || 'asset', mimeType);
  const uploadRoot = getUploadRoot();
  const kindDir = path.join(uploadRoot, kind);

  await fs.mkdir(kindDir, { recursive: true });

  const absolutePath = path.join(kindDir, safeFileName);
  await fs.writeFile(absolutePath, Buffer.from(arrayBuffer));

  return {
    originalName: sanitizeText(file.name || 'asset', 220),
    safeFileName,
    mimeType,
    bytes,
    publicUrl: getPublicUrl(kind, safeFileName),
    storagePath: getStoragePath(kind, safeFileName),
    kind,
  };
}

