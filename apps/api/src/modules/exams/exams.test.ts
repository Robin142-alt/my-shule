import assert from 'node:assert/strict';
import test from 'node:test';

import { PATH_METADATA } from '@nestjs/common/constants';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { ExamsController } from './exams.controller';
import { ExamsRepository } from './repositories/exams.repository';
import { ExamsSchemaService } from './exams-schema.service';
import { ExamsService } from './exams.service';
import { ReportCardGenerationService } from './services/report-card-generation.service';
import { ReportCardTemplateService } from './services/report-card-template.service';

test('ExamsSchemaService creates exam and report-card tables with tenant RLS', async () => {
  let schemaSql = '';
  const service = new ExamsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_series/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_marks/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS student_report_cards/);
  assert.match(schemaSql, /ALTER TABLE exam_marks FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_exam_marks_subject_scope/);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_student_report_cards_tenant_published/);
  assert.doesNotMatch(schemaSql, /CREATE TABLE IF NOT EXISTS student_attendance/i);
});

test('ExamsSchemaService creates grading policy, mark version, report-card workflow, and batch tables', async () => {
  let schemaSql = '';
  const service = new ExamsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_grading_policies/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_grading_policy_boundaries/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_subject_weightings/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_competency_outcomes/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_assessment_components/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_mark_versions/);
  assert.match(schemaSql, /approval_state text NOT NULL/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS report_card_generation_batches/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS report_card_artifacts/);
  assert.match(schemaSql, /draft_requested/);
  assert.match(schemaSql, /regeneration_required/);
  assert.match(schemaSql, /verification_code text/);
  assert.match(schemaSql, /ALTER TABLE report_card_generation_batches FORCE ROW LEVEL SECURITY/);
});

test('ExamsService allows an assigned teacher to enter subject-scoped marks with audit', async () => {
  const calls: string[] = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      upsertMark: async (input: Record<string, unknown>) => {
        calls.push('mark');
        return { id: 'mark-1', score: input.score };
      },
      appendMarkAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
  );

  const mark = await service.enterMark({
    exam_series_id: 'series-1',
    assessment_id: 'assessment-1',
    academic_term_id: 'term-1',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    student_id: 'student-1',
    score: 84,
  });

  assert.equal(mark.score, 84);
  assert.deepEqual(calls, ['mark', 'audit']);
});

test('ExamsService lets an assigned teacher lock a live mark sheet for approval', async () => {
  const calls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      listMarkSheets: async (input: Record<string, unknown>) => {
        calls.push({ name: 'listMarkSheets', input });
        return [{ id: 'window-1', status: 'open' }];
      },
      lockMarkSheet: async (input: Record<string, unknown>) => {
        calls.push({ name: 'lockMarkSheet', input });
        return { id: input.mark_sheet_id, status: 'closed' };
      },
    } as never,
  );

  const locked = await service.lockMarkSheet('window-1');

  assert.equal(locked.status, 'closed');
  assert.deepEqual(calls, [
    {
      name: 'listMarkSheets',
      input: {
        tenant_id: 'tenant-a',
        teacher_user_id: 'teacher-1',
      },
    },
    {
      name: 'lockMarkSheet',
      input: {
        tenant_id: 'tenant-a',
        mark_sheet_id: 'window-1',
        actor_user_id: 'teacher-1',
      },
    },
  ]);
});

test('ExamsService enforces assessment maximum score before mark entry', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 80,
      }),
      upsertMark: async () => {
        throw new Error('over-maximum marks must not be saved');
      },
      appendMarkAuditLog: async () => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 84,
      }),
    /maximum score/,
  );
});

test('ExamsService rejects marks outside configured grade boundaries before persistence', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 100,
      }),
      findGradeBoundaryForScore: async () => ({
        configured_count: 4,
        match_count: 0,
        boundary: null,
      }),
      upsertMark: async () => {
        throw new Error('unexpected persistence');
      },
      appendMarkAuditLog: async () => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 47,
      }),
    /grade boundaries/,
  );
});

test('ExamsService rejects marks matching overlapping grade boundaries', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 100,
      }),
      findGradeBoundaryForScore: async () => ({
        configured_count: 5,
        match_count: 2,
        boundary: { label: 'A' },
      }),
      upsertMark: async () => {
        throw new Error('marks matching overlapping grade boundaries must not be saved');
      },
      appendMarkAuditLog: async () => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 76,
      }),
    /multiple grade boundaries/,
  );
});

test('ExamsService rejects teacher mark entry outside assigned subject scope', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => null,
      upsertMark: async () => {
        throw new Error('unassigned marks must not be saved');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-2',
        student_id: 'student-1',
        score: 84,
      }),
    ForbiddenException,
  );
});

test('ExamsService blocks regular mark mutation after lock and allows audited officer correction', async () => {
  const teacherService = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'locked', locked_at: '2026-05-14T08:00:00.000Z', published_at: null }),
    } as never,
  );

  await assert.rejects(
    () =>
      teacherService.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 86,
      }),
    /locked/,
  );

  const calls: string[] = [];
  const officerService = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      findExistingMark: async () => ({ id: 'mark-1', score: 84 }),
      correctLockedMark: async () => {
        calls.push('correct');
        return { id: 'mark-1', score: 86 };
      },
      appendMarkAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
  );

  const corrected = await officerService.correctLockedMark({
    mark_id: 'mark-1',
    score: 86,
    reason: 'HOD-approved correction',
  });

  assert.equal(corrected.score, 86);
  assert.deepEqual(calls, ['correct', 'audit']);
});

test('ExamsService requires dual approval and marks report-card regeneration after published corrections', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const officerService = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      findExistingMark: async () => ({
        id: 'mark-1',
        score: 84,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        student_id: 'student-1',
      }),
      findPublishedReportCardsForMark: async () => [
        {
          id: 'report-card-1',
          status: 'published',
        },
      ],
      correctLockedMark: async (input: Record<string, unknown>) => {
        calls.push({ name: 'correct', input });
        return { id: 'mark-1', score: 86 };
      },
      createMarkVersion: async (input: Record<string, unknown>) => {
        calls.push({ name: 'version', input });
        return { id: 'mark-version-1' };
      },
      markReportCardsRegenerationRequired: async (input: Record<string, unknown>) => {
        calls.push({ name: 'regeneration', input });
      },
      appendMarkAuditLog: async () => {
        calls.push({ name: 'audit' });
      },
    } as never,
  );

  await assert.rejects(
    () =>
      (officerService as unknown as {
        correctLockedMark: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
      }).correctLockedMark({
        mark_id: 'mark-1',
        score: 86,
        reason: 'Published result correction',
        first_approver_user_id: 'officer-1',
      }),
    /dual approval/,
  );

  const corrected = await (officerService as unknown as {
    correctLockedMark: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }).correctLockedMark({
    mark_id: 'mark-1',
    score: 86,
    reason: 'Published result correction',
    first_approver_user_id: 'officer-1',
    second_approver_user_id: 'principal-1',
  });

  assert.equal(corrected.score, 86);
  assert.deepEqual(calls.map((call) => call.name), ['correct', 'version', 'regeneration', 'audit']);
  assert.equal(calls[1]?.input?.approval_state, 'dual_approved');
  assert.equal(calls[2]?.input?.status, 'regeneration_required');
});

test('ExamsService publishes report cards with snapshot linkage and audit', async () => {
  const calls: string[] = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      createReportCardSnapshot: async () => {
        calls.push('report-card');
        return {
          id: 'report-card-1',
          report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
          status: 'published',
        };
      },
      appendReportCardAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
  );

  const reportCard = await service.publishReportCard({
    exam_series_id: 'series-1',
    student_id: 'student-1',
    report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
  });

  assert.equal(reportCard.status, 'published');
  assert.equal(reportCard.report_snapshot_id, 'report-snapshot:tenant-a:exams:term-2');
  assert.deepEqual(calls, ['report-card', 'audit']);
});

test('ExamsRepository does not mutate already-published report cards on conflict', async () => {
  const queries: string[] = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
      queries.push(sql);
      return {
        rows: [
          {
            id: 'report-card-1',
            report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
            status: 'published',
          },
        ],
      };
    },
  } as never);

  await repository.createReportCardSnapshot({
    tenant_id: 'tenant-a',
    actor_user_id: 'officer-1',
    exam_series_id: 'series-1',
    student_id: 'student-1',
    report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
    metadata: {},
  });

  assert.match(queries[0] ?? '', /WHERE student_report_cards\.status <> 'published'/);
});

test('ExamsRepository prevents mark upsert conflicts from crossing exam or subject scope', async () => {
  const queries: string[] = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
      queries.push(sql);
      return {
        rows: [
          {
            id: 'mark-1',
            exam_series_id: 'series-1',
            academic_term_id: 'term-1',
            class_section_id: 'class-1',
            subject_id: 'subject-1',
            student_id: 'student-1',
          },
        ],
      };
    },
  } as never);

  await repository.upsertMark({
    tenant_id: 'tenant-a',
    actor_user_id: 'teacher-1',
    exam_series_id: 'series-1',
    assessment_id: 'assessment-1',
    academic_term_id: 'term-1',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    student_id: 'student-1',
    score: 84,
    remarks: null,
  });

  assert.match(queries[0] ?? '', /exam_marks\.exam_series_id = EXCLUDED\.exam_series_id/);
  assert.match(queries[0] ?? '', /exam_marks\.academic_term_id = EXCLUDED\.academic_term_id/);
  assert.match(queries[0] ?? '', /exam_marks\.class_section_id = EXCLUDED\.class_section_id/);
  assert.match(queries[0] ?? '', /exam_marks\.subject_id = EXCLUDED\.subject_id/);
});

test('ExamsService generates report-card payloads from marks before publishing', async () => {
  let generatedSnapshotInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      loadReportCardData: async () => ({
        exam_series: {
          id: 'series-1',
          name: 'Term 2 Opener',
          academic_term_name: 'Term 2',
          academic_year_name: '2026',
        },
        student: {
          id: 'student-1',
          full_name: 'Amina Otieno',
          admission_number: 'ADM-001',
          class_name: 'Grade 6',
          stream_name: 'Blue',
        },
        subjects: [
          {
            subject_id: 'subject-1',
            subject_name: 'Mathematics',
            score: 84,
            max_score: 100,
            grade_label: 'A',
            remarks: 'Strong problem solving',
          },
          {
            subject_id: 'subject-2',
            subject_name: 'English',
            score: 72,
            max_score: 100,
            grade_label: 'B',
            remarks: null,
          },
        ],
        attendance: {
          days_present: 58,
          days_absent: 2,
        },
      }),
      createGeneratedReportCardSnapshot: async (input: Record<string, unknown>) => {
        generatedSnapshotInput = input;
        return {
          id: 'report-card-1',
          report_snapshot_id: 'report-card:tenant-a:series-1:student-1:v1',
          status: 'draft',
          metadata: input.metadata,
        };
      },
      appendReportCardAuditLog: async () => undefined,
    } as never,
  );

  const reportCard = await (service as unknown as {
    generateReportCard: (dto: { exam_series_id: string; student_id: string }) => Promise<Record<string, unknown>>;
  }).generateReportCard({
    exam_series_id: 'series-1',
    student_id: 'student-1',
  });

  assert.equal(reportCard.status, 'draft');
  assert.equal(reportCard.report_snapshot_id, 'report-card:tenant-a:series-1:student-1:v1');
  assert.equal(
    (
      generatedSnapshotInput as {
        metadata?: { report_card?: { subjects?: Array<{ subject_name?: string; grade_label?: string }> } };
      } | null
    )?.metadata?.report_card?.subjects?.[0]?.subject_name,
    'Mathematics',
  );
  assert.equal(
    (
      generatedSnapshotInput as {
        metadata?: { report_card?: { totals?: { total_score?: number; mean_score?: number } } };
      } | null
    )?.metadata?.report_card?.totals?.total_score,
    156,
  );
  assert.equal(
    (
      generatedSnapshotInput as {
        metadata?: { report_card?: { totals?: { total_score?: number; mean_score?: number } } };
      } | null
    )?.metadata?.report_card?.totals?.mean_score,
    78,
  );
});

test('ExamsService previews bulk mark uploads and commits only previewed valid rows with audit', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 100,
      }),
      findGradeBoundaryForScore: async () => ({
        configured_count: 4,
        match_count: 1,
        boundary: { label: 'A', min_score: 80, max_score: 100 },
      }),
      upsertMark: async (input: Record<string, unknown>) => {
        calls.push({ name: 'mark', input });
        return { id: `mark-${calls.length}`, score: input.score };
      },
      appendMarkAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ name: 'audit', input });
      },
    } as never,
  );

  const rows = [
    {
      row_number: 2,
      exam_series_id: 'series-1',
      assessment_id: 'assessment-1',
      academic_term_id: 'term-1',
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      student_id: 'student-1',
      score: 84,
    },
  ];
  const preview = await (service as unknown as {
    bulkUploadMarks: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }).bulkUploadMarks({ mode: 'preview', rows });

  assert.equal(preview.valid_rows, 1);
  assert.equal(preview.invalid_rows, 0);
  assert.equal(preview.committed_rows, 0);
  assert.equal(calls.length, 0);

  const committed = await (service as unknown as {
    bulkUploadMarks: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }).bulkUploadMarks({ mode: 'commit', preview_token: preview.preview_token, rows });

  assert.equal(committed.committed_rows, 1);
  assert.deepEqual(calls.map((call) => call.name), ['mark', 'audit']);
  assert.equal(calls[1]?.input?.action, 'bulk_grade.updated');
});

test('ExamsService reports duplicate and unauthorized rows during bulk mark upload preview', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async (input: Record<string, unknown>) =>
        input.subject_id === 'subject-1' ? { id: 'assignment-1' } : null,
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 100,
      }),
      findGradeBoundaryForScore: async () => ({
        configured_count: 4,
        match_count: 1,
        boundary: { label: 'A', min_score: 80, max_score: 100 },
      }),
      upsertMark: async () => {
        throw new Error('bulk preview must not save rows');
      },
      appendMarkAuditLog: async () => undefined,
    } as never,
  );

  const preview = await (service as unknown as {
    bulkUploadMarks: (dto: Record<string, unknown>) => Promise<{
      invalid_rows: number;
      duplicate_rows: number;
      row_results: Array<{ row_number: number; status: string; errors: string[] }>;
    }>;
  }).bulkUploadMarks({
    mode: 'preview',
    rows: [
      {
        row_number: 2,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 84,
      },
      {
        row_number: 3,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 84,
      },
      {
        row_number: 4,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-2',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-2',
        student_id: 'student-2',
        score: 81,
      },
    ],
  });

  assert.equal(preview.invalid_rows, 2);
  assert.equal(preview.duplicate_rows, 1);
  assert.match(preview.row_results[1]?.errors.join(' '), /Duplicate/);
  assert.match(preview.row_results[2]?.errors.join(' '), /not assigned/);
});

test('ReportCardGenerationService generates HTML and PDF artifacts with a verification code', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const service = new ReportCardGenerationService(
    {
      loadReportCardData: async () => ({
        exam_series: {
          id: 'series-1',
          name: 'Term 2 Opener',
          academic_term_name: 'Term 2',
          academic_year_name: '2026',
        },
        student: {
          id: 'student-1',
          full_name: 'Amina Otieno',
          admission_number: 'ADM-001',
          class_name: 'Grade 6',
          stream_name: 'Blue',
        },
        school: {
          name: 'Shule Demo Primary',
          address: 'Nairobi',
          phone: '+254700000000',
        },
        comments: {
          class_teacher: 'Good consistency.',
          principal: 'Promoted to the next class.',
        },
        next_term: {
          opening_date: '2026-09-01',
        },
        subjects: [
          {
            subject_id: 'subject-1',
            subject_name: 'Mathematics',
            score: 84,
            max_score: 100,
            grade_label: 'A',
            remarks: 'Strong problem solving',
          },
        ],
      }),
      createGeneratedReportCardSnapshot: async (input: Record<string, unknown>) => {
        calls.push({ name: 'snapshot', input });
        return {
          id: 'report-card-1',
          status: 'draft_generated',
          verification_code: input.verification_code,
          metadata: input.metadata,
        };
      },
      recordReportCardArtifact: async (input: Record<string, unknown>) => {
        calls.push({ name: 'artifact', input });
        return {
          id: `artifact-${calls.filter((call) => call.name === 'artifact').length}`,
          ...input,
        };
      },
      appendReportCardAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ name: 'audit', input });
      },
    } as never,
    new ReportCardTemplateService(),
  );

  const result = await service.generateStudentReportCard({
    tenant_id: 'tenant-a',
    actor_user_id: 'officer-1',
    exam_series_id: 'series-1',
    student_id: 'student-1',
    generated_at: '2026-05-20T08:00:00.000Z',
  });

  assert.equal(result.status, 'draft_generated');
  assert.match(String(result.verification_code), /^[A-Z0-9]{12}$/);
  assert.deepEqual(calls.map((call) => call.name), ['snapshot', 'artifact', 'artifact', 'audit']);
  assert.deepEqual(
    calls.filter((call) => call.name === 'artifact').map((call) => call.input?.artifact_type).sort(),
    ['html', 'pdf'],
  );
  assert.equal(
    (
      calls[0]?.input?.metadata as {
        report_card?: { template_fields?: { school_name?: string; principal_comment?: string } };
      }
    ).report_card?.template_fields?.school_name,
    'Shule Demo Primary',
  );
  assert.equal(
    (
      calls[0]?.input?.metadata as {
        report_card?: { template_fields?: { school_name?: string; principal_comment?: string } };
      }
    ).report_card?.template_fields?.principal_comment,
    'Promoted to the next class.',
  );
});

test('ReportCardGenerationService refuses report-card generation when a numeric subject has no grade boundary', async () => {
  const service = new ReportCardGenerationService(
    {
      loadReportCardData: async () => ({
        exam_series: {
          id: 'series-1',
          name: 'Term 2 Opener',
        },
        student: {
          id: 'student-1',
          full_name: 'Amina Otieno',
        },
        subjects: [
          {
            subject_id: 'subject-1',
            subject_name: 'Mathematics',
            score: 64,
            max_score: 100,
            grade_label: null,
            remarks: null,
          },
        ],
      }),
      createGeneratedReportCardSnapshot: async () => {
        throw new Error('ungraded report cards must not be saved');
      },
      recordReportCardArtifact: async () => {
        throw new Error('ungraded report cards must not create artifacts');
      },
      appendReportCardAuditLog: async () => undefined,
    } as never,
    new ReportCardTemplateService(),
  );

  await assert.rejects(
    () =>
      service.generateStudentReportCard({
        tenant_id: 'tenant-a',
        actor_user_id: 'officer-1',
        exam_series_id: 'series-1',
        student_id: 'student-1',
        generated_at: '2026-05-20T08:00:00.000Z',
      }),
    /grade boundary/,
  );
});

test('ExamsService starts class report-card batches and returns progress status', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const reportCardGenerationService = {
    generateReportCardBatch: async (input: Record<string, unknown>) => {
      calls.push({ name: 'batch', input });
      return {
        id: 'batch-1',
        status: 'draft_generated',
        queue_status: 'completed',
        total_students: 2,
        completed_students: 2,
        failed_students: 0,
      };
    },
    getReportCardBatchStatus: async (input: Record<string, unknown>) => {
      calls.push({ name: 'status', input });
      return {
        id: input.batch_id,
        status: 'draft_generated',
        queue_status: 'completed',
        total_students: 2,
        completed_students: 2,
        failed_students: 0,
      };
    },
  };
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'officer-1',
        role: 'admin',
        permissions: ['exams:approve'],
      }),
    } as never,
    {} as never,
    undefined,
    reportCardGenerationService as never,
  );

  const batch = await service.generateReportCardBatch({
    exam_series_id: 'series-1',
    class_section_id: 'class-1',
    stream_name: 'Blue',
  });
  const status = await service.getReportCardBatchStatus('batch-1');

  assert.equal(batch.queue_status, 'completed');
  assert.equal(status.completed_students, 2);
  assert.deepEqual(calls, [
    {
      name: 'batch',
      input: {
        tenant_id: 'tenant-a',
        actor_user_id: 'officer-1',
        exam_series_id: 'series-1',
        class_section_id: 'class-1',
        stream_name: 'Blue',
        batch_size: 200,
        offset: 0,
      },
    },
    {
      name: 'status',
      input: {
        tenant_id: 'tenant-a',
        batch_id: 'batch-1',
      },
    },
  ]);
});

test('ExamsService verifies printed report cards by tenant-scoped verification code', async () => {
  const reportCardGenerationService = {
    verifyPrintedReportCard: async (input: Record<string, unknown>) => ({
      verification_code: input.verification_code,
      status: 'valid',
      student: { full_name: 'Amina Otieno' },
      exam_series: { name: 'Term 2 Opener' },
      artifact_types: ['html', 'pdf'],
    }),
  };
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'officer-1',
        role: 'admin',
        permissions: ['exams:read'],
      }),
    } as never,
    {} as never,
    undefined,
    reportCardGenerationService as never,
  );

  const verification = await service.verifyReportCard(' RC-2026-ABC ');

  assert.deepEqual(verification, {
    verification_code: 'RC-2026-ABC',
    status: 'valid',
    student: { full_name: 'Amina Otieno' },
    exam_series: { name: 'Term 2 Opener' },
    artifact_types: ['html', 'pdf'],
  });
});

test('ExamsController exposes teacher mark sheets as a read endpoint', () => {
  const handler = ExamsController.prototype.listMarkSheets as unknown as Function;
  const lockHandler = ExamsController.prototype.lockMarkSheet as unknown as Function;

  assert.equal(typeof handler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'mark-sheets');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['exams:read']);
  assert.equal(typeof lockHandler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, lockHandler), 'mark-sheets/:markSheetId/lock');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, lockHandler), ['exams:enter-marks']);
});

test('ExamsService lists tenant mark sheets with teacher and series filters', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:read'] }) } as never,
    {
      listMarkSheets: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [
          {
            exam_series_id: 'series-1',
            subject_id: 'subject-1',
            class_section_id: 'class-1',
            mark_count: 18,
          },
        ];
      },
    } as never,
  );

  const rows = await (service as unknown as {
    listMarkSheets: (query: Record<string, string | undefined>) => Promise<Array<Record<string, unknown>>>;
  }).listMarkSheets({
    teacher_user_id: ' teacher-1 ',
    exam_series_id: 'series-1',
    subject_id: '',
    limit: '500',
    offset: '-10',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    teacher_user_id: 'teacher-1',
    exam_series_id: 'series-1',
    limit: 50,
    offset: 0,
  });
  assert.equal(rows[0]?.mark_count, 18);
});

test('ExamsRepository paginates mark-sheet lists', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  } as never);

  await repository.listMarkSheets({
    tenant_id: 'tenant-a',
    teacher_user_id: '00000000-0000-0000-0000-000000000801',
    limit: 500,
    offset: -10,
  });

  assert.match(calls[0]!.sql, /LIMIT \$6::integer\s+OFFSET \$7::integer/);
  assert.equal(calls[0]!.params[5], 50);
  assert.equal(calls[0]!.params[6], 0);
});

test('ExamsService creates actor-bound signed parent report-card downloads for linked children', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'parent-1',
        role: 'parent',
        permissions: ['portal:read_own_children'],
      }),
    } as never,
    {
      findReportCardForGuardian: async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          id: 'report-card-1',
          student_id: 'student-1',
          report_snapshot_id: 'report-card:tenant-a:series-1:student-1:v1',
          status: 'published',
          metadata: {
            report_card: {
              student: { full_name: 'Amina Otieno' },
              totals: { percentage: 84 },
            },
          },
        };
      },
    } as never,
    {
      get: (key: string) => {
        if (key === 'reportCards.downloadSigningSecret') return 'report-card-download-secret-with-32-characters';
        if (key === 'reportCards.downloadTtlSeconds') return 900;
        return undefined;
      },
    } as never,
  );

  const signed = await (service as unknown as {
    createParentReportCardDownload: (reportCardId: string) => Promise<Record<string, unknown>>;
  }).createParentReportCardDownload(' report-card-1 ');

  assert.equal(calls[0]?.tenant_id, 'tenant-a');
  assert.equal(calls[0]?.guardian_user_id, 'parent-1');
  assert.equal(calls[0]?.report_card_id, 'report-card-1');
  assert.equal(signed.report_card_id, 'report-card-1');
  assert.equal(signed.student_id, 'student-1');
  assert.match(String(signed.token), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.match(String(signed.download_url), /^\/exams\/report-cards\/download\//);

  const downloaded = await (service as unknown as {
    readParentReportCardDownloadToken: (token: string) => Promise<Record<string, unknown>>;
  }).readParentReportCardDownloadToken(String(signed.token));

  assert.equal(downloaded.report_snapshot_id, 'report-card:tenant-a:series-1:student-1:v1');
  assert.equal(
    (downloaded.metadata as { report_card?: { totals?: { percentage?: number } } }).report_card?.totals?.percentage,
    84,
  );
});

test('ExamsService hides report-card downloads from unrelated parents', async () => {
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'parent-2',
        role: 'parent',
        permissions: ['portal:read_own_children'],
      }),
    } as never,
    {
      findReportCardForGuardian: async () => null,
    } as never,
    {
      get: (key: string) => {
        if (key === 'reportCards.downloadSigningSecret') return 'report-card-download-secret-with-32-characters';
        return undefined;
      },
    } as never,
  );

  await assert.rejects(
    () =>
      (service as unknown as {
        createParentReportCardDownload: (reportCardId: string) => Promise<Record<string, unknown>>;
      }).createParentReportCardDownload('report-card-1'),
    NotFoundException,
  );
});

test('ExamsService rejects withdrawn report-card downloads for linked parents', async () => {
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'parent-1',
        role: 'parent',
        permissions: ['portal:read_own_children'],
      }),
    } as never,
    {
      findReportCardForGuardian: async () => ({
        id: 'report-card-1',
        student_id: 'student-1',
        report_snapshot_id: 'report-card:tenant-a:series-1:student-1:v1',
        status: 'withdrawn',
        metadata: {
          withdrawn_at: '2026-05-18T12:00:00.000Z',
        },
      }),
    } as never,
    {
      get: (key: string) => {
        if (key === 'reportCards.downloadSigningSecret') return 'report-card-download-secret-with-32-characters';
        return undefined;
      },
    } as never,
  );

  await assert.rejects(
    () =>
      (service as unknown as {
        createParentReportCardDownload: (reportCardId: string) => Promise<Record<string, unknown>>;
      }).createParentReportCardDownload('report-card-1'),
    ForbiddenException,
  );
});

test('ExamsController exposes guardian-scoped report-card download endpoints', () => {
  const tokenHandler = ExamsController.prototype.createParentReportCardDownload as unknown as Function;
  const downloadHandler = ExamsController.prototype.downloadParentReportCard as unknown as Function;

  assert.equal(Reflect.getMetadata(PATH_METADATA, tokenHandler), 'report-cards/:reportCardId/parent-download');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, tokenHandler), ['portal:read_own_children']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, downloadHandler), 'report-cards/download/:token');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, downloadHandler), ['portal:read_own_children']);
});

test('ExamsController exposes report-card batch, regeneration, and verification endpoints', () => {
  const batchHandler = ExamsController.prototype.generateReportCardBatch as unknown as Function;
  const batchStatusHandler = ExamsController.prototype.getReportCardBatchStatus as unknown as Function;
  const regenerateHandler = ExamsController.prototype.regenerateReportCard as unknown as Function;
  const verifyHandler = ExamsController.prototype.verifyReportCard as unknown as Function;

  assert.equal(Reflect.getMetadata(PATH_METADATA, batchHandler), 'report-cards/batches');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, batchHandler), ['exams:approve']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, batchStatusHandler), 'report-cards/batches/:batchId');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, batchStatusHandler), ['exams:read']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, regenerateHandler), 'report-cards/regenerate');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, regenerateHandler), ['exams:approve']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, verifyHandler), 'report-cards/verify/:verificationCode');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, verifyHandler), ['exams:read']);
});

test('ExamsRepository bounds report-card listing and avoids SELECT star', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never);

  await repository.listReportCards({
    tenant_id: 'tenant-a',
    student_id: '00000000-0000-0000-0000-000000000101',
    limit: 999,
    offset: 6,
  } as never);

  const reportCardsQuery = queries[0]?.text ?? '';
  assert.doesNotMatch(reportCardsQuery, /SELECT\s+\*/i);
  assert.match(reportCardsQuery, /card\.id::text/);
  assert.match(reportCardsQuery, /WHERE card\.tenant_id = \$1/);
  assert.match(reportCardsQuery, /LIMIT \$3::integer/);
  assert.match(reportCardsQuery, /OFFSET \$4::integer/);
  assert.deepEqual(queries[0]?.values, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000101',
    50,
    6,
  ]);
});

test('ExamsRepository chunks report-card batch students with limit and offset', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never);

  await repository.listStudentsForReportCardBatch({
    tenant_id: 'tenant-a',
    class_section_id: null,
    stream_name: null,
    limit: 1000,
    offset: 20,
  } as never);

  const studentsQuery = queries[0]?.text ?? '';
  assert.doesNotMatch(studentsQuery, /LIMIT 1000/);
  assert.match(studentsQuery, /LIMIT \$4::integer/);
  assert.match(studentsQuery, /OFFSET \$5::integer/);
  assert.deepEqual(queries[0]?.values, ['tenant-a', null, null, 200, 20]);
});

test('ExamsService normalizes report-card list pagination before querying', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-1', role: 'exams_manager', permissions: ['exams:read'] }) } as never,
    {
      listReportCards: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [];
      },
    } as never,
  );

  await service.listReportCards({
    student_id: ' 00000000-0000-0000-0000-000000000101 ',
    limit: '999',
    offset: '-5',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    student_id: '00000000-0000-0000-0000-000000000101',
    limit: 50,
    offset: 0,
  });
});

test('ExamsController exposes configuration, draft, alignment, review, and lifecycle endpoints', () => {
  const configureExam = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.configureExam);
  const saveDraft = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.saveDraft);
  const alignExam = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.alignExam);
  const reviewExam = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.reviewExam);
  const updateLifecycle = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.updateLifecycle);

  assert.equal(configureExam, 'configuration');
  assert.equal(saveDraft, 'draft');
  assert.equal(alignExam, 'alignment');
  assert.equal(reviewExam, 'review');
  assert.equal(updateLifecycle, 'lifecycle');
});

test('ExamsService moderateMarks updates mark statuses and adds versions for rejected marks', async () => {
  const calls: string[] = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'hod-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      moderateMarks: async (input: Record<string, unknown>) => {
        calls.push(`moderate:${input.action}`);
        return [{ id: 'mark-1', score: 85 }];
      },
      createMarkVersion: async (input: Record<string, unknown>) => {
        calls.push(`version:${input.approval_state}`);
      },
    } as never,
  );

  const result = await service.moderateMarks({
    mark_ids: ['mark-1'],
    action: 'return_for_correction',
    reason: 'Score too high',
  });

  assert.equal(result.updated_count, 1);
  assert.deepEqual(calls, ['moderate:return_for_correction', 'version:rejected']);
});

test('ExamsController exposes new moderation and publishing endpoints', () => {
  const getDepartmentMarks = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.getDepartmentMarks);
  const moderateMarks = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.moderateMarks);
  const lockMarks = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.lockMarks);
  const publishExamSeries = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.publishExamSeries);

  assert.equal(getDepartmentMarks, 'marks/department');
  assert.equal(moderateMarks, 'marks/moderate');
  assert.equal(lockMarks, 'marks/lock');
  assert.equal(publishExamSeries, 'series/:id/publish');
});


test('ExamsService enforces strict Mark Entry permission rules based on teacher allocation', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-2', role: 'teacher', permissions: ['academics:write'] }) } as never,
    {
      findTeacherAssignment: async () => null, // No allocation found
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
    } as never,
  );

  await assert.rejects(
    () => service.enterMark({
      exam_series_id: 'series-1',
      assessment_id: 'assessment-1',
      academic_term_id: 'term-1',
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      student_id: 'student-1',
      score: 84,
    }),
    /Teacher is not assigned to this subject/i
  );
});

test('ExamsService handles HOD Review workflow for returning submitted marks', async () => {
  const repositoryCalls: Array<{ method: string; args: any }> = [];

  const mockRepository = {
    moderateMarks: async (args: any) => {
      repositoryCalls.push({ method: 'moderateMarks', args });
      return [
        { id: 'mark-1', score: 85 }
      ];
    },
    createMarkVersion: async (args: any) => {
      repositoryCalls.push({ method: 'createMarkVersion', args });
      return { id: 'version-1' };
    }
  };

  const mockRequestContext = {
    getStore: () => ({
      tenant_id: 'tenant-a',
      user_id: 'hod-1',
      role: 'hod',
      permissions: ['exams:approve']
    })
  };

  const service = new ExamsService(
    mockRequestContext as never,
    mockRepository as never
  );

  const res = await service.moderateMarks({
    mark_ids: ['mark-1'],
    action: 'return_for_correction',
    reason: 'Incorrect entry',
  });

  assert.deepEqual(res, { success: true, updated_count: 1 });
  assert.equal(repositoryCalls.length, 2);
  assert.equal(repositoryCalls[0].method, 'moderateMarks');
  assert.deepEqual(repositoryCalls[0].args, {
    tenant_id: 'tenant-a',
    mark_ids: ['mark-1'],
    action: 'return_for_correction',
    actor_user_id: 'hod-1'
  });
  assert.equal(repositoryCalls[1].method, 'createMarkVersion');
  assert.deepEqual(repositoryCalls[1].args, {
    tenant_id: 'tenant-a',
    mark_id: 'mark-1',
    original_score: 85,
    correction_score: 85,
    corrected_by_user_id: 'hod-1',
    reason: 'Incorrect entry',
    approval_state: 'rejected'
  });
});

