import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';
import { ReportCardExportService } from './report-card-export.service';
import { ReportCardTemplateService } from './report-card-template.service';

function fixture(count = 3) {
  const cards = Array.from({ length: count }, (_, i) => ({
    id: String(i),
    updated_at: '2026-09-23',
    ineligible_reason: null,
  }));
  const calls: unknown[] = [];
  const exams = {
    assertReportCardScopeAccess: () => 'school-a',
    bulkDownloadReportCards: async () => ({
      cards,
      preview_token: 'current',
      scope: { scopeType: 'school' },
    }),
  };
  const work = {
    submit: async (...args: unknown[]) => {
      calls.push(args);
      return { state: 'queued', job_id: 'job' };
    },
  };
  const service = new ReportCardExportService(
    exams as never,
    {} as never,
    {} as never,
    {} as never,
    work as never,
    {} as never,
    {} as never,
  );
  return { service, cards, calls, exams };
}
for (const count of [1, 205, 1000])
  test(`${count} reports queue without rendering on the API`, async () => {
    const { service, calls } = fixture(count);
    assert.equal(
      (await service.prepare({ preview_token: 'current' })).state,
      'queued',
    );
    assert.equal(calls.length, 1);
  });
test('unconfirmed, changed and excessive scopes are rejected before queueing', async () => {
  const { service, calls } = fixture();
  await assert.rejects(
    () => service.prepare(null as never),
    /Provide a report-card scope/,
  );
  await assert.rejects(
    () => service.prepare({ preview_token: 'old' }),
    /changed/,
  );
  assert.equal(calls.length, 0);
  await assert.rejects(
    () => fixture(20001).service.prepare({ preview_token: 'current' }),
    /20,000/,
  );
});
test('bulk worker uploads one complete PDF and always removes its temporary file', async () => {
  const { cards, exams } = fixture(205);
  const payload = new ReportCardTemplateService().buildPayload(
    {
      school: { name: 'Test school' },
      student: { full_name: 'Test learner' },
      subjects: [
        {
          subject_id: 'math',
          subject_name: 'Mathematics',
          score: 84,
          max_score: 100,
        },
      ],
    },
    '2026-09-23T00:00:00Z',
  );
  const batches: number[] = [];
  let path = '';
  let failUpload = false;
  let writes = 0;
  const progress: number[] = [];
  const repository = {
    executeSql: async () => ({ rows: [] }),
    listReportCardIdsForBulkDownload: async (query: {
      report_card_ids: string[];
    }) => {
      batches.push(query.report_card_ids.length);
      return query.report_card_ids.map((id) => ({
        ...cards[Number(id)],
        verification_code: 'TEST-' + id,
        metadata: { report_card: payload },
      }));
    },
  };
  const storage = {
    saveFile: async (input: { path: string; storagePath: string }) => {
      path = input.path;
      writes++;
      const bytes = await readFile(path);
      assert.equal(
        (bytes.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length,
        205,
      );
      if (failUpload) throw new Error('Storage offline');
      return { stored_path: input.storagePath };
    },
  };
  const service = new ReportCardExportService(
    exams as never,
    repository as never,
    {} as never,
    storage as never,
    {} as never,
    {} as never,
    {} as never,
  );
  service.recordExport = async () => undefined;
  const row = {
    id: 'test-job',
    tenant_id: 'school-a',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    input: { query: { preview_token: 'current' } },
  };
  const result = await (service as any).executeJob(
    row,
    async (value: { rendered: number }) => {
      progress.push(value.rendered);
    },
  );
  assert.equal(result.count, 205);
  assert.equal(writes, 1);
  assert.deepEqual(batches, [50, 50, 50, 50, 5]);
  assert.match(result.path, /tenant\/school-a\/reports\/temporary\/test-job\//);
  await assert.rejects(() => access(path));
  failUpload = true;
  await assert.rejects(
    () => (service as any).executeJob(row, async () => undefined),
    /Storage offline/,
  );
  await assert.rejects(() => access(path));
});

test('another authorized staff member reuses the exact school export without extending its expiry', async () => {
  const { exams } = fixture();
  let recorded = 0;
  let lostLease = false;
  const expiry = new Date(Date.now() + 600000).toISOString();
  const result = {
    path: 'tenant/school-a/reports/temporary/opaque.pdf',
    count: 3,
  };
  const repository = {
    executeSql: async (sql: string, values: unknown[]) => {
      if (sql.includes('SELECT work.result')) {
        assert.deepEqual(values, ['school-a', 'confirmed-scope']);
        assert.match(sql, /file\.tenant_id=work\.tenant_id/);
        return { rows: [{ result, expires_at: expiry }] };
      }
      assert.match(sql, /LEAST\(expires_at/);
      assert.match(sql, /lease_until>now\(\)/);
      assert.deepEqual(values, ['school-a', 'job-two', 'lease', expiry]);
      return { rows: lostLease ? [] : [{ id: 'job-two' }] };
    },
  };
  const service = new ReportCardExportService(
    exams as never,
    repository as never,
    {} as never,
    {
      saveFile: () => {
        throw new Error('A reusable export must not be uploaded again');
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  service.generate = async () => {
    throw new Error('A reusable export must not be rendered again');
  };
  service.recordExport = async (ids, scope, count, id) => {
    assert.deepEqual(ids, ['0', '1', '2']);
    assert.equal(count, 3);
    assert.equal(id, 'job-two');
    recorded++;
  };
  const row = {
    id: 'job-two',
    tenant_id: 'school-a',
    identity: 'confirmed-scope',
    lease_token: 'lease',
    input: { query: { preview_token: 'current' } },
  };
  assert.deepEqual(
    await (service as any).executeJob(row, async () => undefined),
    { ...result, reused: true },
  );
  assert.equal(recorded, 1);
  lostLease = true;
  await assert.rejects(
    () => (service as any).executeJob(row, async () => undefined),
    /lease lost/,
  );
  assert.equal(recorded, 1);
});
