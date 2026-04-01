import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { MEDIA_ROLES } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import {
  assertSameOrigin,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  jsonSuccess,
} from '../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';
import { normalizeUploadKind, saveMediaFile } from '../../../../../lib/media';
import { sanitizeText } from '../../../../../lib/sanitize';
import { buildRequestLogMeta, logError, logWarn, serializeError } from '../../../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.media.upload', requestId);

  if (!assertSameOrigin(request)) {
    logWarn('admin.media_upload_invalid_origin', requestMeta);
    return jsonError('Invalid request origin.', 403, undefined, { requestId });
  }
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.mediaUpload)) {
    logWarn('admin.media_upload_payload_too_large', requestMeta);
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: MEDIA_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.media_upload_unauthorized',
    forbiddenEvent: 'admin.media_upload_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse upload payload.', 400, undefined, { requestId });

  const kind = normalizeUploadKind(formData.get('kind'));
  const altText = sanitizeText(formData.get('altText'), 220) || null;
  const description = sanitizeText(formData.get('description'), 2000) || null;

  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File)) {
    return jsonError('No file was provided for upload.', 400, undefined, { requestId });
  }

  try {
    const saved = await saveMediaFile(fileEntry, kind);

    const asset = await prisma.mediaAsset.create({
      data: {
        name: saved.originalName,
        url: saved.publicUrl,
        type: saved.kind,
        storagePath: saved.storagePath,
        mimeType: saved.mimeType,
        altText,
        description,
        bytes: saved.bytes,
        metadata: {
          safeFileName: saved.safeFileName,
          uploadedFrom: 'admin-upload',
        },
        uploadedByAdminId: adminSession.userId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        mimeType: true,
        bytes: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'MEDIA_UPLOADED',
        entity: 'MediaAsset',
        entityId: asset.id,
        actorAdminId: adminSession.userId,
        details: {
          type: asset.type,
          url: asset.url,
          bytes: asset.bytes,
        },
      },
    });

    return jsonSuccess({
      asset,
      message: 'Upload completed successfully.',
    }, 200, { requestId });
  } catch (error) {
    logError('admin.media_upload_failed', {
      ...requestMeta,
      userId: adminSession.userId,
      error: serializeError(error),
    });
    return jsonError(
      error instanceof Error ? error.message : 'Unable to process upload.',
      422,
      undefined,
      { requestId },
    );
  }
}


