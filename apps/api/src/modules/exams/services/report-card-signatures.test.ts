import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';
import { createReportCardPdfArtifact } from './report-card-pdf-artifact';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import PDFDocument from 'pdfkit';

import { PERMISSIONS_KEY } from '../../../auth/auth.constants';
import { ReportCardDownloadController } from '../report-card-download.controller';
import { ReportCardGenerationService } from './report-card-generation.service';
import { ReportCardExportService } from './report-card-export.service';
import { ReportCardTemplateService, type ReportCardPayload } from './report-card-template.service';

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
