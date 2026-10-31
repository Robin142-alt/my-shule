import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { CorrectMissingMarkReasonDto } from './dto/exams.dto';
import { ExamsController } from './exams.controller';
import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { ExamsRepository } from './repositories/exams.repository';
import { evidence } from './analytics/testing/evidence.fixture';

test('individual reason correction validates its version, existing category and scope identifiers', async () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const payload = { mark_entry_window_id: randomUUID(), assessment_id: randomUUID(), student_id: randomUUID(),
    score_status: 'absent', expected_updated_at: '2026-10-30 11:45:33.123456+00', paper_config_version: 1 };
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: CorrectMissingMarkReasonDto });
  assert.equal((await validate(payload)).expected_updated_at, payload.expected_updated_at);
  assert.equal((await validate({ ...payload, expected_updated_at: null })).expected_updated_at, null);
  for (const patch of [{ expected_updated_at: undefined }, { expected_updated_at: 'invalid' }, { student_id: 'other' },
    { score_status: 'entered' }, { score_status: 'new_reason' }, { paper_config_version: 0 }, { tenant_id: 'school-b' }]) {
    await assert.rejects(() => validate({ ...payload, ...patch }));
  }
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, ExamsController.prototype.correctMissingMarkReason), ['exams:enter-marks']);
});

test('an analytics cache reloads when another API instance changes the school report-source revision', async () => {
  const repository = new ExamsRepository({} as never);
  let version = '1:'; let reads = 0;
  repository.executeSql = async <T>(sql: string) => {
    const rows = sql.includes('AS revision') ? [{ revision: version }]
      : sql.includes('WITH request_identity') ? (reads++, [evidence({ average: version === '1:' ? 75 : 51 })]) : [];
    return { rows: rows as T[], rowCount: rows.length };
  };
  const scope = { level: 'school' as const, actor_user_id: 'manager', role: 'exams_manager' };
  const filters = { page: 1, page_size: 25, analytics_mode: 'library' as const };
  await repository.getAnalytics('school-a', scope, filters);
  await repository.getAnalytics('school-a', scope, filters);
  assert.equal(reads, 1, 'unchanged source can reuse the bounded cache');
  version = '2:';
  await repository.getAnalytics('school-a', scope, filters);
  assert.equal(reads, 2, 'a committed change on another instance invalidates cached evidence immediately');
  await repository.getAnalytics('school-b', scope, filters);
  assert.equal(reads, 3, 'school caches remain separate');
});
