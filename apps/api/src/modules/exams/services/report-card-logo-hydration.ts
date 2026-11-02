import type { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import type { ReportCardPayload } from './report-card-template.service';
import { BadRequestException } from '@nestjs/common';
import { classifyReportCardFailure, ReportProcessingFailure } from './report-card-generation-resilience';

type ReportCardImageStorage = Pick<DatabaseFileStorageService, 'readForTenant'>;
export type ReportImageReadCache = Map<string, Promise<Awaited<ReturnType<ReportCardImageStorage['readForTenant']>>>>;

const IMAGE_MIME_TYPE_PATTERN = /^image\/(?:png|jpe?g)$/i;

export async function hydrateReportCardLogoForRendering(
  payload: ReportCardPayload,
  tenantIdValue: string,
  fileStorage?: ReportCardImageStorage,
  strict = false,
  cache?: ReportImageReadCache,
  revision = '',
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
      const key = JSON.stringify([tenantId, storagePath, revision]);
      let pending = cache?.get(key);
      if (!pending) {
        pending = fileStorage.readForTenant({ tenantId, storagePath });
        cache?.set(key, pending);
        void pending.catch(() => { cache?.delete(key); });
      }
      storedImage = await pending;
    } catch (error) {
      if (strict) {
        if (error instanceof BadRequestException) throw new ReportProcessingFailure('REPORT_IMAGE_CONFIGURATION',
          'A required report logo or signature is missing or invalid. Repair the school image before retrying.', false, error);
        const failure = classifyReportCardFailure(error);
        if (failure.code !== 'REPORT_GENERATION_ERROR') throw new ReportProcessingFailure(failure.code, failure.message, failure.retryable, error);
        throw new ReportProcessingFailure('REPORT_STORAGE_UNAVAILABLE',
          'A report signature or school logo could not be read. Retry after storage recovers.', true, error);
      }
      return;
    }
    const mimeType = storedImage.mime_type.trim().toLowerCase();

    if (
      storedImage.stored_path !== storagePath
      || !IMAGE_MIME_TYPE_PATTERN.test(mimeType)
    ) {
      if (strict) throw new ReportProcessingFailure('REPORT_IMAGE_CONFIGURATION', 'A report image is invalid. Repair the image and regenerate the report.', false);
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
