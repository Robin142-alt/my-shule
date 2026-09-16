import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { BadRequestException } from '@nestjs/common';
import { classifyReportCardFailure, ReportCardWorkLimiter } from './report-card-generation-resilience';
import { ReportCardGenerationService } from './report-card-generation.service';

test('failure classification explains schema errors without leaking SQL and never retries validation', () => {
  assert.deepEqual(classifyReportCardFailure(new BadRequestException('Mathematics has no grade boundary match')), {
    code: 'INVALID_REPORT_DATA', message: 'Mathematics has no grade boundary match', retryable: false,
  });
  const schema = classifyReportCardFailure({ code: 'P2010', meta: { code: '42703' }, message: 'private SELECT staff.full_name' });
  assert.equal(schema.code, 'REPORT_SCHEMA_MISMATCH');
  assert.equal(schema.retryable, false);
  assert.doesNotMatch(schema.message, /SELECT|staff.full_name/);
  assert.equal(classifyReportCardFailure({ code: 'P2010', meta: { code: '40001' } }).retryable, true);
  assert.equal(classifyReportCardFailure({ code: 'P2024' }).retryable, true);
  assert.equal(classifyReportCardFailure(new Error('unexpected private data')).retryable, false);
});

test('limiter releases a failed slot and caps simultaneous work across callers', async () => {
  const limiter = new ReportCardWorkLimiter(4);
  let active = 0; let peak = 0;
  const results = await Promise.allSettled(Array.from({ length: 30 }, (_, index) => limiter.run(async () => {
    active++; peak = Math.max(peak, active);
    try { await delay(2); if (index === 5) throw new Error('expected'); return index; }
    finally { active--; }
  })));
  assert.equal(peak, 4);
  assert.equal(active, 0);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 29);
});

test('batch retries only transient failures, preserves verification identity, and reports partial results', async () => {
  const attempts = new Map<string, number>();
  const timestamps = new Map<string, Set<string>>();
  let active = 0; let peak = 0;
  const service = new ReportCardGenerationService({
    getReportCardBatchReadiness: async () => ({ expected_mark_count: 12, not_ready_mark_count: 0 }),
    listStudentsForReportCardBatch: async () => Array.from({ length: 12 }, (_, index) => ({ id: String(index), student_name: `Learner ${index}` })),
    createReportCardGenerationBatch: async () => ({ id: 'batch' }),
    updateReportCardGenerationBatch: async (input: any) => ({ ...input, id: 'batch' }),
  } as never, {} as never);
  service.generateStudentReportCard = async (input) => {
    const attempt = (attempts.get(input.student_id) ?? 0) + 1;
    attempts.set(input.student_id, attempt);
    const values = timestamps.get(input.student_id) ?? new Set<string>();
    values.add(input.generated_at!); timestamps.set(input.student_id, values);
    assert.equal(input.reuse_existing, true);
    active++; peak = Math.max(peak, active);
    try {
      await delay(2);
      if (input.student_id === '0' && attempt === 1) throw Object.assign(new Error('serialization'), { code: '40001' });
      if (input.student_id === '1') throw new BadRequestException('Grade missing');
      if (input.student_id === '2') throw Object.assign(new Error('unavailable'), { code: 'P1001' });
      return { id: input.student_id, reused: input.student_id === '3' };
    } finally { active--; }
  };
  const result = await service.generateReportCardBatch({ tenant_id: 'school-a', actor_user_id: 'officer', exam_series_id: 'exam' });
  assert.equal(peak, 4);
  assert.equal(result.completed_students, 10);
  assert.equal(result.failed_students, 2);
  assert.equal(result.reused_students, 1);
  assert.equal(result.queue_status, 'failed');
  assert.equal(attempts.get('0'), 2);
  assert.equal(attempts.get('1'), 1);
  assert.equal(attempts.get('2'), 3);
  assert.equal(timestamps.get('0')!.size, 1);
  assert.equal(result.failures?.find(failure => failure.student_id === '1')?.message, 'Grade missing');
  assert.equal(result.failures?.find(failure => failure.student_id === '2')?.retryable, true);
});
