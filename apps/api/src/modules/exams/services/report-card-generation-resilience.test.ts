import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { BadRequestException } from '@nestjs/common';
import { classifyReportCardFailure, ReportCardWorkLimiter } from './report-card-generation-resilience';
import { ReportCardGenerationService } from './report-card-generation.service';
import type { ReportWorkHandler, ReportWorkRow } from './report-work.service';

test('scoped regeneration resumes confirmed targets across chunks with partial failures and safe reuse', async () => {
  const handlers = new Map<string, ReportWorkHandler>();
  const events: any[] = [];
  const calls: any[] = [];
  const service = new ReportCardGenerationService({} as never, {} as never, undefined,
    { recordSchoolOperation: async (event: unknown) => { events.push(event); } } as never,
    { register: (kind: string, handler: ReportWorkHandler) => handlers.set(kind, handler) } as never);
  service.onModuleInit();
  service.generateStudentReportCard = async input => {
    calls.push(input);
    if (input.student_id === 'student-26') throw new BadRequestException('Marks are not locked');
    return { id: input.student_id, reused: input.student_id === 'student-1' };
  };
  const row = { id: 'job', tenant_id: 'school-a', actor_user_id: 'manager', dispatch_version: 1,
    input: { operation: 'regenerate', exam_series_id: 'exam', regeneration_reason: 'Refresh signatures',
      generated_at: '2026-09-25T09:00:00Z', skipped_students: 2,
      targets: Array.from({length: 27}, (_,i)=>({id:`card-${i}`,student_id:`student-${i}`,student_name:`Learner ${i}`,updated_at:'2026-09-24T09:00:00Z'})) },
    result: null } as unknown as ReportWorkRow;
  const handler = handlers.get('generate_regeneration_scope')!;
  const progress: any[] = [];
  const first = await handler(row, async value => { progress.push({...value}); });
  assert.equal(first.__continue, true);
  assert.equal(first.input.offset, 25);
  assert.equal(first.result.completed_students, 25);
  assert.equal(events.length, 0);
  const last = await handler({...row,input:first.input,result:first.result}, async value => { progress.push({...value}); });
  assert.equal(last.queue_status, 'failed');
  assert.equal(last.completed_students, 26);
  assert.equal(last.failed_students, 1);
  assert.equal(last.reused_students, 1);
  assert.equal(last.skipped_students, 2);
  assert.equal(last.failures[0].message, 'Marks are not locked');
  assert.equal(new Set(calls.map(input=>input.student_id)).size, 27);
  assert.ok(calls.every(input=>input.tenant_id==='school-a' && input.actor_user_id==='manager' && input.reuse_existing));
  assert.equal(calls[0].expected_report_card_id, 'card-0');
  assert.equal(calls[0].expected_updated_at, '2026-09-24T09:00:00Z');
  assert.equal(events[0].event.type, 'report_generation.failed');
  assert.equal(progress.at(-1).completed_students, 26);
});

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
