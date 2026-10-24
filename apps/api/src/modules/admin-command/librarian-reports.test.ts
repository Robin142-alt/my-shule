import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { LibrarianCommandController } from './librarian-command.controller';
import { LibrarianCommandService } from './librarian-command.service';
import { libraryActivityReport, libraryReportPeriod } from './library-report-data';

test('library reports expose saved snapshots in the workspace contract', async () => {
  const saved = { id: 'saved-report', report_name: 'Library operations report', generated_at: new Date().toISOString(),
    report_type: 'library-operations', period: 'Not recorded', generated_by: 'Librarian', status: 'Ready', file_format: 'csv' };
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new LibrarianCommandService(
    { getStore: () => ({ tenant_id: 'school-a' }) } as never,
    { query: async (sql: string, params: unknown[]) => { queries.push({ sql, params }); return { rows: [saved] }; } } as never,
    { listReportSnapshots: async () => [saved] } as never,
  );
  const result = await service.getReports() as any;
  assert.deepEqual(result.reports, [saved]);
  assert.equal(result.metrics.total_reports, 1);
  assert.equal(result.metrics.this_month, 1);
  assert.equal(result.metrics.pending, 0);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.match(queries[0].sql, /librarian-command/);
  assert.deepEqual(queries[0].params, ['school-a']);
});

test('library report generation validates the actor, type and format before reading data', async () => {
  const store: any = { tenant_id: 'school-a', user_id: '11111111-1111-4111-8111-111111111111' };
  const service = new LibrarianCommandService({ getStore: () => store } as never, {} as never,
    { uuidOrNull: (value: unknown) => value ?? null } as never);
  await assert.rejects(service.generateReport({ report_type: 'invalid' }), BadRequestException);
  await assert.rejects(service.generateReport({ report_type: 'inventory', format: 'html' }), BadRequestException);
  store.user_id = null;
  await assert.rejects(service.generateReport({}), UnauthorizedException);
  store.tenant_id = null;
  await assert.rejects(service.getReports(), UnauthorizedException);
});

test('library report access is scoped, audited and rejects missing or corrupt artifacts', async () => {
  const content = Buffer.from('%PDF-1.7 example');
  let row: any = { id: 'report', snapshotId: 'snapshot', artifact: { content_base64: content.toString('base64'),
    byte_length: content.length, checksum_sha256: createHash('sha256').update(content).digest('hex') } };
  const queries: any[] = [], audits: any[] = [];
  const service = new LibrarianCommandService(
    { getStore: () => ({ tenant_id: 'school-a', user_id: '11111111-1111-4111-8111-111111111111' }) } as never,
    { query: async (sql: string, params: unknown[]) => { queries.push({ sql, params }); return { rows: row ? [row] : [] }; } } as never,
    { uuidOrNull: (value: unknown) => value, requiredText: (value: unknown) => value,
      recordAudit: async (...args: unknown[]) => audits.push(args) } as never);
  assert.equal((await service.downloadReport('report')).report, row);
  assert.deepEqual(queries[0].params, ['school-a', 'report']);
  assert.match(queries[0].sql, /tenant_id = \$1 AND module = 'librarian-command'/);
  assert.equal(audits[0][1], 'library.report.accessed');
  row.artifact.content_base64 = Buffer.from('changed').toString('base64');
  await assert.rejects(service.downloadReport('report'), ConflictException);
  row = null;
  await assert.rejects(service.downloadReport('other-school-report'), NotFoundException);
  assert.equal(audits.length, 1);
});

test('report period uses school term dates and rejects missing terms instead of silently broadening the report', async () => {
  await assert.rejects(libraryReportPeriod(async () => ({ rows: [] }), 'school-a', 'invalid'), BadRequestException);
  await assert.rejects(libraryReportPeriod(async () => ({ rows: [{ start_date: null }] }), 'school-a', 'this_term'), /Configure term dates/);
});

test('most borrowed counts returned loans and borrower activity groups only the requested ledger', async () => {
  const rows = [
    { book_id: 'book', book_title: 'Mathematics', borrower_id: 'pupil', borrower_name: 'Student', action: 'issue' },
    { book_id: 'book', book_title: 'Mathematics', borrower_id: 'pupil', borrower_name: 'Student', action: 'return' },
    { book_id: 'book', book_title: 'Mathematics', borrower_id: 'pupil', borrower_name: 'Student', action: 'issue' },
  ];
  const query = async (sql: string, params: unknown[]) => {
    assert.match(sql, /ledger.tenant_id = \$1/);
    assert.match(sql, /ledger.created_at >=/);
    assert.deepEqual(params, ['school-a', '2026-10-01', '2026-10-25']);
    return { rows };
  };
  const range = { start_date: '2026-10-01', end_date: '2026-10-25' };
  assert.deepEqual(await libraryActivityReport(query, 'school-a', 'most_borrowed', range), [{ book_title: 'Mathematics', times_borrowed: 2 }]);
  const borrowers = await libraryActivityReport(query, 'school-a', 'borrower_activity', range);
  assert.equal(borrowers[0].issues, 2);
  assert.equal(borrowers[0].returns, 1);
});

test('report endpoints retain library write, read and module guards', () => {
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, LibrarianCommandController.prototype.generateReport), ['library:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, LibrarianCommandController.prototype.downloadReport), ['library:read']);
});
