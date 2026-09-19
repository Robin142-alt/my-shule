import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { ReportCardExportService } from './report-card-export.service';
import { ReportCardTemplateService } from './report-card-template.service';
const jobId = 'a'.repeat(64);
function setup(count = 3) {
  const calls: unknown[][] = [];
  const context = { requireStore: () => ({ tenant_id: 'school-a', user_id: 'actor', role: 'exams_manager', permissions: ['exams:read'], request_id: 'request' }) };
  const job = { data: { context: { tenant_id: 'school-a', user_id: 'actor' } }, getState: async () => 'completed', progress: { rendered: count },
    returnvalue: { count, paths: ['tenant/school-a/reports/one', 'tenant/school-a/reports/two'], expires_at: new Date(Date.now() + 3600000).toISOString() } };
  const exams = { assertReportCardScopeAccess: () => 'school-a', bulkDownloadReportCards: async () => ({ preview_token: 'confirmed', scope: { scopeType: 'school' },
      cards: Array.from({ length: count }, (_, i) => ({ id: String(i), ineligible_reason: null })) }) };
  const storage = { readForTenant: async (input: unknown) => { calls.push(['read', input]); return { content: Buffer.from(calls.length === 1 ? '%PDF-' : 'EOF') }; } };
  const queue = { isDegraded: () => false, getQueue: () => ({ getJob: async () => job }), add: async (...args: unknown[]) => { calls.push(['queued', ...args]); } };
  const service = new ReportCardExportService(exams as never, {} as never, context as never, storage as never, queue as never, {} as never, {} as never, {} as never, {} as never);
  (service as any).ensureWorker = () => undefined;
  return { service, job, queue, calls };
}
test('small exports receive a confirmed direct download URL', async () => {
  const { service, calls } = setup();
  const result = await service.prepare({ scope_type: 'school', preview_token: 'confirmed' });
  assert.equal(result.state, 'ready');
  assert.match(result.download_url ?? '', /preview_token=confirmed/);
  assert.equal(calls.length, 0);
});
test('large exports use the existing queue with actor and school binding', async () => {
  const { service, calls } = setup(501);
  const result = await service.prepare({ scope_type: 'school', preview_token: 'confirmed' });
  assert.equal(result.state, 'queued');
  assert.equal(calls.length, 1);
  const payload = (calls[0][2] as any);
  assert.equal(payload.context.tenant_id, 'school-a');
  assert.equal(payload.context.user_id, 'actor');
  assert.equal(payload.context.session_id, null);
  assert.equal(payload.context.db_client, undefined);
});
test('exports fail truthfully on a stale confirmation or degraded queue', async () => {
  const { service, queue } = setup(501);
  await assert.rejects(() => service.prepare(null as never), /Provide a report-card scope/);
  await assert.rejects(() => service.prepare({ preview_token: 'stale' }), /changed/);
  queue.isDegraded = () => true;
  await assert.rejects(() => service.prepare({ preview_token: 'confirmed' }), /Redis/);
});
test('job status and download reject another school or actor', async () => {
  const { service, job } = setup();
  job.data.context.tenant_id = 'school-b';
  await assert.rejects(() => service.status(jobId), /not found/);
  await assert.rejects(() => service.download(jobId), /not found/);
  job.data.context.tenant_id = 'school-a';
  job.data.context.user_id = 'other-user';
  await assert.rejects(() => service.status(jobId), /not found/);
});
test('persisted chunks are reassembled server-side in PDF byte order and expiration is enforced', async () => {
  const { service, job, calls } = setup();
  const result = await service.download(jobId);
  const chunks: Buffer[] = [];
  for await (const chunk of result.stream as Readable)
    chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString(), '%PDF-EOF');
  assert.equal(calls.length, 2);
  job.returnvalue.expires_at = '2020-01-01';
  await assert.rejects(() => service.download(jobId), /expired/);
});
test('large queued exports render every card in bounded batches and persist one auditable PDF', async () => {
  const count = 205;
  const cards = Array.from({ length: count }, (_, i) => ({ id: String(i), updated_at: '2026-09-19', ineligible_reason: null }));
  const batches: number[] = [];
  const progress: number[] = [];
  const stored: Buffer[] = [];
  const payload = new ReportCardTemplateService().buildPayload({ school: { name: 'Scope School' },
    student: { full_name: 'Learner', admission_number: 'ADM-1', class_name: 'Grade 8' },
    exam_series: { name: 'Term 3' }, subjects: [{ subject_id: 'math', subject_name: 'Mathematics', score: 84, max_score: 100 }] }, '2026-09-19T10:00:00Z');
  const exams = { assertReportCardScopeAccess: () => 'school-a', bulkDownloadReportCards: async () => ({ cards, preview_token: 'confirmed', scope: { scopeType: 'school' } }) };
  const repository = { listReportCardIdsForBulkDownload: async (query: {
      report_card_ids: string[];
    }) => {
      batches.push(query.report_card_ids.length);
      return query.report_card_ids.map(id => ({ id, updated_at: '2026-09-19', verification_code: `VERIFY-${id}`, metadata: { report_card: payload } }));
    } };
  const storage = { save: async (input: {
      buffer: Buffer;
      storagePath: string;
    }) => { stored.push(input.buffer); return { stored_path: input.storagePath }; } };
  const service = new ReportCardExportService(exams as never, repository as never, {} as never, storage as never, {} as never, {} as never, {} as never, { findFirstMissingModule: async () => null } as never, {} as never);
  const audits: string[][] = [];
  service.recordExport = async (ids) => { audits.push(ids); };
  const result = await (service as any).executeJob({ id: jobId, data: { query: { preview_token: 'confirmed' } }, updateProgress: async (value: {
      rendered: number;
    }) => progress.push(value.rendered) });
  assert.equal(result.count, count);
  assert.deepEqual(batches, [50, 50, 50, 50, 5]);
  assert.deepEqual(progress, [50, 100, 150, 200, 205]);
  assert.equal(audits[0].length, count);
  assert.ok(result.paths.every((path: string) => path.startsWith('tenant/school-a/reports/report-cards/')));
  assert.equal((Buffer.concat(stored).toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, count);
});
