import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';
import { createReportCardPdfArtifact } from './report-card-pdf-artifact';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, Module, NotFoundException } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import type { Request, Response, NextFunction } from 'express';
import { Readable } from 'node:stream';
import PDFDocument from 'pdfkit';

import { PERMISSIONS_KEY } from '../../../auth/auth.constants';
import { ReportCardDownloadController } from '../report-card-download.controller';
import { ReportCardGenerationService } from './report-card-generation.service';
import { ReportCardExportService } from './report-card-export.service';
import { ReportCardTemplateService, type ReportCardPayload } from './report-card-template.service';
import { ReportCardArtifactsService } from './report-card-artifacts.service';
import { REPORT_RENDERER_VERSION } from './report-artifact-identity';
import { ExamsRepository } from '../repositories/exams.repository';
import { ExamsService } from '../exams.service';
import { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { RequestContextMiddleware } from '../../../middleware/request-context.middleware';
import { ResponseEnvelopeInterceptor } from '../../../interceptors/response-envelope.interceptor';
import { RequestIdInterceptor } from '../../../interceptors/request-id.interceptor';

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const paths = {
  teacher: 'tenant/school-a/exams/report-card-signatures/class_teacher/teacher/signature.png',
  principal: 'tenant/school-a/exams/report-card-signatures/principal/principal/signature.png',
};
const source = () => ({
  school: { name: 'Signature Test School' },
  student: { id: 'learner', full_name: 'Test Learner', class_teacher_name: 'Assigned Teacher' },
  exam_series: { id: 'exam', name: 'End Term 3' },
  comments: {
    class_teacher_name: 'Assigned Teacher', class_teacher_signature_ref: paths.teacher,
    principal_name: 'School Principal', principal_signature_ref: paths.principal,
  },
  subjects: [{ subject_id: 'math', subject_name: 'Mathematics', score: 84, max_score: 100, grade_label: 'A' }],
});
const payload = () => new ReportCardTemplateService().buildPayload(source(), '2026-09-23T09:00:00.000Z');

function storage() {
  const reads: string[] = [];
  return {
    reads,
    readForTenant: async (input: { tenantId: string; storagePath: string }) => {
      assert.equal(input.tenantId, 'school-a');
      assert.ok(Object.values(paths).includes(input.storagePath));
      reads.push(input.storagePath);
      return { stored_path: input.storagePath, mime_type: 'image/png', content: image };
    },
  };
}

function controller(cardPayload: ReportCardPayload | null = payload()) {
  const files = storage();
  const queries: unknown[][] = [];
  const card = { id: 'card', status: 'draft_generated', verification_code: 'VERIFY', metadata: { report_card: cardPayload } };
  const access = { assertReportCardScopeAccess: () => 'school-a' };
  const repository = { executeSql: async (sql: string, values: unknown[]) => {
    assert.match(sql, /WHERE tenant_id = \$1 AND id = \$2::uuid/);
    queries.push(values);
    return { rowCount: values[1] === 'card' ? 1 : 0, rows: [card] };
  } };
  return { files, queries, card, access,
    service: new ReportCardDownloadController(repository as never, access as never, {} as never, files as never) };
}

test('initial generation embeds both saved signatures in the durable PDF while remaining a draft', async (t) => {
  const files = storage();
  const template = new ReportCardTemplateService();
  const images = t.mock.method(PDFDocument.prototype, 'image');
  const service = new ReportCardGenerationService({
    loadReportCardData: async () => source(), findReusableReportCard: async () => null,
    saveGeneratedReportCard: async (snapshot: Record<string, unknown>, artifacts: unknown[], audit: { action: string }) => {
      assert.equal(audit.action, 'report_card.generated');
      assert.equal(artifacts.length, 1);
      return { id: 'card', ...snapshot };
    },
  } as never, template, files as never);
  const result = await service.generateStudentReportCard({
    tenant_id: 'school-a', actor_user_id: 'exams-manager', exam_series_id: 'exam', student_id: 'learner',
  });
  assert.equal(result.status, 'draft_generated');
  assert.equal(result.template_version, 3);
  assert.deepEqual(files.reads.sort(), Object.values(paths).sort());
  assert.equal(images.mock.calls.filter((call: { arguments: unknown[] }) => Buffer.isBuffer(call.arguments[0]) && call.arguments[0].equals(image)).length, 2);
  const persisted = (result.metadata as { report_card: ReportCardPayload }).report_card;
  assert.equal(persisted.template_fields.class_teacher_signature_ref, paths.teacher);
  assert.equal(persisted.template_fields.principal_signature_ref, paths.principal);
});

test('single and bulk PDFs include both signatures throughout the review lifecycle', async (t) => {
  const images = t.mock.method(PDFDocument.prototype, 'image');
  for (const status of ['draft_generated', 'under_review', 'approved', 'published']) {
    const { service, files, card } = controller();
    card.status = status;
    const result = await createReportCardPdfArtifact(await hydrateReportCardLogoForRendering(payload(), 'school-a', files as never, true), 'VERIFY');
    assert.equal(result.contentType, 'application/pdf');
    assert.deepEqual(files.reads.sort(), Object.values(paths).sort());
  }
  const files = storage();
  const cards = ['draft_generated', 'under_review', 'approved', 'published'].map((status, index) => ({
    id: `card-${index}`, status, updated_at: '2026-09-23', ineligible_reason: null,
    verification_code: `VERIFY-${index}`, metadata: { report_card: payload() },
  }));
  const service = new ReportCardExportService({
    assertReportCardScopeAccess: () => 'school-a',
    bulkDownloadReportCards: async () => ({ cards, preview_token: 'confirmed', scope: { scopeType: 'school' } }),
  } as never, { listReportCardIdsForBulkDownload: async () => cards } as never, {} as never, files as never,
  {} as never, {} as never, {} as never);
  const artifact = await service.generate({ preview_token: 'confirmed' });
  try {
    assert.equal(artifact.count, 4);
    assert.deepEqual(files.reads.sort(), Object.values(paths).sort(), 'bulk exports cache each school-owned signature');
    assert.equal(images.mock.calls.filter((call: { arguments: unknown[] }) => Buffer.isBuffer(call.arguments[0]) && call.arguments[0].equals(image)).length, 16);
  } finally { await artifact.cleanup(); }
});

test('preview signatures use the report snapshot and inherit report-card authorization and tenant scope', async () => {
  const { service, files, queries, access } = controller();
  for (const role of ['class_teacher', 'principal']) {
    const result = await service.readReportCardSignature('card', role as never);
    assert.equal(result.getHeaders().type, 'image/png');
    const chunks: Buffer[] = [];
    for await (const chunk of result.getStream()) chunks.push(Buffer.from(chunk));
    assert.deepEqual(Buffer.concat(chunks), image);
  }
  assert.deepEqual(queries, [['school-a', 'card'], ['school-a', 'card']]);
  assert.deepEqual(files.reads.sort(), Object.values(paths).sort());
  await assert.rejects(service.readReportCardSignature('foreign-card', 'principal' as never), NotFoundException);
  access.assertReportCardScopeAccess = () => { throw new ForbiddenException('School report access required'); };
  await assert.rejects(service.readReportCardSignature('card', 'principal' as never), ForbiddenException);
  assert.equal(files.reads.length, 2);
  const handler = ReportCardDownloadController.prototype.readReportCardSignature;
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['exams:read']);
  assert.ok(Reflect.getMetadata(HEADERS_METADATA, handler).some((header: { name: string; value: string }) => header.name === 'Cache-Control' && header.value === 'private, no-store'));
});

test('preview refuses absent, cross-school, external or traversal signature references', async () => {
  for (const path of [null, 'tenant/school-b/signature.png', 'https://example.test/signature.png', 'tenant/school-a/../school-b/signature.png', 'tenant/school-a/signatures\\other.png']) {
    const report = payload();
    report.template_fields.principal_signature_ref = path;
    const { service, files } = controller(report);
    await assert.rejects(service.readReportCardSignature('card', 'principal' as never), NotFoundException);
    assert.equal(files.reads.length, 0);
  }
  await assert.rejects(controller(null).service.readReportCardSignature('card', 'principal' as never), /Regenerate/);
});

test('report HTTP endpoints deliver signature and PDF bytes through the global response interceptor', async () => {
  const context = new RequestContextService();
  const card = {
    id: '10000000-0000-4000-8000-000000000001', tenant_id: 'school-a', student_id: 'learner',
    is_current: true, status: 'draft_generated', verification_code: 'VERIFY',
    metadata: { report_card: payload(), source_revision: '[]', renderer_version: REPORT_RENDERER_VERSION },
  };
  const repository = { executeSql: async (sql: string, values: unknown[]) => {
    if (sql.includes('report_source_versions')) return { rows: [] };
    assert.match(sql, /WHERE tenant_id=\$1 AND id=\$2::uuid/);
    const rows = values[0] === card.tenant_id && values[1] === card.id ? [card] : [];
    return { rows, rowCount: rows.length };
  } };
  const files = storage();
  const artifacts = new ReportCardArtifactsService(repository as never, files as never, {} as never, context, {} as never);
  const pdf = await createReportCardPdfArtifact(await hydrateReportCardLogoForRendering(payload(), 'school-a', files as never, true), 'VERIFY');
  const access = { assertReportCardScopeAccess: () => {
    const actor = context.requireStore();
    if (actor.role !== 'exams_manager' || !actor.permissions.includes('exams:read')) throw new ForbiddenException();
    return actor.tenant_id;
  } };
  @Module({
    controllers: [ReportCardDownloadController],
    providers: [
      { provide: RequestContextService, useValue: context },
      { provide: ExamsRepository, useValue: repository },
      { provide: ExamsService, useValue: access },
      { provide: DatabaseFileStorageService, useValue: files },
      { provide: ReportCardArtifactsService, useValue: {
        load: artifacts.load.bind(artifacts),
        prepare: async (id: string) => { await artifacts.load(id); return { state: 'ready' }; },
        read: async (id: string) => { await artifacts.load(id); return pdf; },
      } },
      { provide: ReportCardExportService, useValue: {
        status: async () => ({ state: 'ready' }),
        download: async () => ({ stream: Readable.from([pdf.content]) }),
        recent: async () => [],
      } },
    ],
  })
  class SignatureWireModule {}
  const app = await NestFactory.create(SignatureWireModule, { logger: false });
  const middleware = new RequestContextMiddleware(context);
  // Fixed local fixture sessions exercise the real JWT guard; no production
  // identity or credential is used by this transport regression test.
  app.use((req: Request, res: Response, next: NextFunction) => middleware.use(req, res, () => {
    context.setTenantId(String(req.headers['x-test-tenant'] ?? 'school-a'));
    context.setRole(req.headers['x-test-role'] === 'parent' ? 'parent' : 'exams_manager');
    context.setPermissions(['exams:read']);
    context.setAuthenticated(req.headers['x-test-auth'] !== 'anonymous');
    context.setSessionId('fixture-session');
    next();
  }));
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(context, new Reflector()), new RequestIdInterceptor(context));
  await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/exams/report-cards`;
  const signatureUrl = `${base}/${card.id}/signatures/principal`;
  try {
    for (const status of ['draft_generated', 'under_review', 'approved', 'published']) {
      card.status = status;
      for (const role of ['class_teacher', 'principal']) {
        const response = await fetch(`${base}/${card.id}/signatures/${role}?v=VERIFY`, {
          headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'image/png');
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('content-disposition'), 'inline');
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
      }
    }
    for (const path of [`${card.id}/download`, 'exports/export-fixture/download']) {
      const response = await fetch(`${base}/${path}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'application/pdf');
      assert.match(response.headers.get('content-disposition') ?? '', /^attachment;/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf.content);
    }
    const jobs = await fetch(`${base}/jobs`);
    assert.deepEqual((await jobs.json() as { data: unknown }).data, [], 'JSON endpoints still use their envelope');
    assert.equal((await fetch(signatureUrl, { headers: { 'x-test-auth': 'anonymous' } })).status, 401);
    assert.equal((await fetch(signatureUrl, { headers: { 'x-test-role': 'parent' } })).status, 403);
    assert.equal((await fetch(signatureUrl, { headers: { 'x-test-tenant': 'school-b' } })).status, 404);
    assert.equal((await fetch(`${base}/${card.id}/signatures/invalid`)).status, 400);
    card.metadata.source_revision = 'old';
    assert.equal((await fetch(signatureUrl)).status, 409, 'stale reports still require controlled regeneration');
  } finally { await app.close(); }
});
