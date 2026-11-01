import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { S3CompatibleObjectStorageService } from '../../../common/uploads/s3-object-storage.service';
import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';
import { classifyReportCardFailure } from './report-card-generation-resilience';

const config = { UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://objects.example.test',
  UPLOAD_OBJECT_STORAGE_BUCKET: 'school-files', UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'test-key',
  UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'private-test-secret' };
const input = { tenantId: 'school-a', storagePath: 'tenant/school-a/logo.png' };

test('storage authorization failures preserve evidence and do not retry as transient outages', async () => {
  const storage = new S3CompatibleObjectStorageService({ get: (key: string) => config[key as keyof typeof config] } as never);
  const failure = await storage.getObject(input, async () => ({ ok: false, status: 403 })).catch(error => error);
  assert.equal(failure.storageStatus, 403);
  const report = await hydrateReportCardLogoForRendering({ template_fields: { school_logo_ref: input.storagePath } } as never,
    input.tenantId, { readForTenant: async () => { throw failure; } } as never, true).catch(error => error);
  assert.equal(report.cause, failure);
  assert.equal(classifyReportCardFailure(report).code, 'REPORT_STORAGE_CONFIGURATION');
  assert.equal(classifyReportCardFailure(report).retryable, false);
  assert.doesNotMatch(JSON.stringify(classifyReportCardFailure(report)), /private-test-secret|school-a\/logo/);
});

test('storage outages remain retryable and missing images require repair', async () => {
  const storage = new S3CompatibleObjectStorageService({ get: (key: string) => config[key as keyof typeof config] } as never);
  const failure = await storage.getObject(input, async () => ({ ok: false, status: 503 })).catch(error => error);
  assert.equal(classifyReportCardFailure(failure).code, 'REPORT_STORAGE_UNAVAILABLE');
  assert.equal(classifyReportCardFailure(failure).retryable, true);
  const missing = await hydrateReportCardLogoForRendering({ template_fields: { school_logo_ref: input.storagePath } } as never,
    input.tenantId, { readForTenant: async () => { throw new BadRequestException('File object was not found'); } } as never, true).catch(error => error);
  assert.equal(classifyReportCardFailure(missing).code, 'REPORT_IMAGE_CONFIGURATION');
  assert.equal(classifyReportCardFailure(missing).retryable, false);
});
