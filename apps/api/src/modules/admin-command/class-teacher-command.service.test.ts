import assert from 'node:assert/strict';
import test from 'node:test';

import { ClassTeacherCommandService } from './class-teacher-command.service';

const TEACHER_ID = '11111111-1111-4111-8111-111111111111';

function createService(operations: any, prisma: any = {
  query: async () => ({ rows: [{ id: 'appointment-a' }], rowCount: 1 }),
}) {
  return new ClassTeacherCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: TEACHER_ID, role: 'class_teacher', is_authenticated: true }),
    } as never,
    prisma,
    operations,
  );
}

test('ClassTeacherCommandService exposes download URLs for generated class reports', async () => {
  const service = createService({
    readSql: async () => ({ rows: [{
      id: 'row-a',
      snapshotId: 'snapshot-a',
      reportName: 'Class register',
      type: 'pdf',
      generatedDate: '2026-06-20T09:15:00.000Z',
    }], rowCount: 1 }),
  });

  const result = await service.getReports();

  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].download_url, '/api/admin-command/class-teacher/reports/snapshot-a/download');
});

test('ClassTeacherCommandService downloads report snapshots through tenant and module scoped lookup', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = createService({
    requiredText: (value: unknown) => String(value ?? '').trim(),
    readSql: async (sql: string, params: unknown[]) => {
      reads.push({ sql, params });
      return {
        rows: [
          {
            snapshot_id: 'snapshot-a',
            title: 'Class register',
            format: 'pdf',
            artifact: { filename: 'class-register.pdf' },
            manifest: { sections: { overview: { learners: 40 } } },
            manifest_checksum_sha256: 'checksum-a',
            created_at: '2026-06-20T09:15:00.000Z',
          },
        ],
        rowCount: 1,
      };
    },
  });

  const result = await service.downloadReport('snapshot-a');

  assert.equal(result.snapshot_id, 'snapshot-a');
  assert.equal(result.title, 'Class register');
  assert.equal(result.artifact.filename, 'class-register.pdf');
  assert.match(reads[0].sql, /FROM report_snapshots/);
  assert.match(reads[0].sql, /tenant_id = \$1/);
  assert.match(reads[0].sql, /module = 'class-teacher-command'/);
  assert.match(reads[0].sql, /generated_by_user_id::text = \$3/);
  assert.equal(reads[0].params[0], 'tenant-a');
  assert.equal(reads[0].params[1], 'snapshot-a');
  assert.equal(reads[0].params[2], TEACHER_ID);
});
