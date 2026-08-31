import type { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import type { ReportCardPayload } from './report-card-template.service';

type ReportCardLogoStorage = Pick<DatabaseFileStorageService, 'readForTenant'>;

const IMAGE_MIME_TYPE_PATTERN = /^image\/(?:png|jpe?g)$/i;

export async function hydrateReportCardLogoForRendering(
  payload: ReportCardPayload,
  tenantIdValue: string,
  fileStorage?: ReportCardLogoStorage,
): Promise<ReportCardPayload> {
  const clonedPayload: ReportCardPayload = {
    ...payload,
    template_fields: {
      ...payload.template_fields,
    },
  };
  const tenantId = tenantIdValue.trim();
  const storagePath = payload.template_fields.school_logo_ref?.trim() ?? '';

  if (!fileStorage || !isTenantScopedStoragePath(tenantId, storagePath)) {
    return clonedPayload;
  }

  let storedLogo: Awaited<ReturnType<ReportCardLogoStorage['readForTenant']>>;
  try {
    storedLogo = await fileStorage.readForTenant({ tenantId, storagePath });
  } catch {
    return clonedPayload;
  }
  const mimeType = storedLogo.mime_type.trim().toLowerCase();

  if (
    storedLogo.stored_path !== storagePath
    || !IMAGE_MIME_TYPE_PATTERN.test(mimeType)
  ) {
    return clonedPayload;
  }

  clonedPayload.template_fields.school_logo_ref =
    `data:${mimeType};base64,${storedLogo.content.toString('base64')}`;

  return clonedPayload;
}

function isTenantScopedStoragePath(tenantId: string, storagePath: string): boolean {
  if (!tenantId || !storagePath.startsWith(`tenant/${tenantId}/`)) {
    return false;
  }

  const segments = storagePath.split('/');

  return !storagePath.startsWith('/')
    && !storagePath.includes('\\')
    && segments.every((segment) => Boolean(segment) && segment !== '.' && segment !== '..');
}
