import type { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import type { ReportCardPayload } from './report-card-template.service';
import { BadRequestException,ServiceUnavailableException } from '@nestjs/common';

type ReportCardImageStorage = Pick<DatabaseFileStorageService, 'readForTenant'>;

const IMAGE_MIME_TYPE_PATTERN = /^image\/(?:png|jpe?g)$/i;

export async function hydrateReportCardLogoForRendering(
  payload: ReportCardPayload,
  tenantIdValue: string,
  fileStorage?: ReportCardImageStorage,
  strict = false,
): Promise<ReportCardPayload> {
  const clonedPayload: ReportCardPayload = {
    ...payload,
    template_fields: {
      ...payload.template_fields,
    },
  };
  const tenantId = tenantIdValue.trim();
  if (!fileStorage) {
    return clonedPayload;
  }

  const imageFields: Array<
    'school_logo_ref' | 'class_teacher_signature_ref' | 'principal_signature_ref'
  > = [
    'school_logo_ref',
    'class_teacher_signature_ref',
    'principal_signature_ref',
  ];
  await Promise.all(imageFields.map(async (field) => {
    const storagePath = payload.template_fields[field]?.trim() ?? '';
    if (!isTenantScopedStoragePath(tenantId, storagePath)) {
      if(strict && storagePath) throw new BadRequestException('Report logos and signatures must be uploaded to this school before generating the PDF.');
      return;
    }

    let storedImage: Awaited<ReturnType<ReportCardImageStorage['readForTenant']>>;
    try {
      storedImage = await fileStorage.readForTenant({ tenantId, storagePath });
    } catch {
      if (strict) throw new ServiceUnavailableException('A report signature or school logo could not be read. Retry after storage recovers.');
      return;
    }
    const mimeType = storedImage.mime_type.trim().toLowerCase();

    if (
      storedImage.stored_path !== storagePath
      || !IMAGE_MIME_TYPE_PATTERN.test(mimeType)
    ) {
      if (strict) throw new ServiceUnavailableException('A report image is invalid. Repair the image and regenerate the report.');
      return;
    }

    clonedPayload.template_fields[field] =
      `data:${mimeType};base64,${storedImage.content.toString('base64')}`;
  }));

  return clonedPayload;
}

export function isTenantScopedStoragePath(tenantId: string, storagePath: string): boolean {
  if (!tenantId || !storagePath.startsWith(`tenant/${tenantId}/`)) {
    return false;
  }

  const segments = storagePath.split('/');

  return !storagePath.startsWith('/')
    && !storagePath.includes('\\')
    && segments.every((segment) => Boolean(segment) && segment !== '.' && segment !== '..');
}
