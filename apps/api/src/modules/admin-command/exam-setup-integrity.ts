import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '@prisma/client';

export async function examSetupTransaction<T>(prisma: PrismaService, tenantId: string, actorId: string,
  action: (operations: AdminCommandOperationsService, tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.executeWithTenant(tenantId, actorId, async (tx) => {
    const operations = new AdminCommandOperationsService({
      query: async (sql: string, params: unknown[] = []) => {
        if (/^\s*(SELECT|WITH|SHOW)\b/i.test(sql) || /\bRETURNING\b/i.test(sql)) {
          const rows = await tx.$queryRawUnsafe<unknown[]>(sql, ...params);
          return { rows, rowCount: rows.length };
        }
        return { rows: [], rowCount: await tx.$executeRawUnsafe(sql, ...params) };
      },
    } as PrismaService);
    return action(operations, tx);
  });
}

export async function lockExam(operations: AdminCommandOperationsService, tenantId: string, examId: string) {
  const result = await operations.readSql(`SELECT series.*,
    COALESCE((SELECT MAX(max_score) FROM exam_assessments WHERE tenant_id = $1 AND exam_series_id = $2::uuid), 100) AS max_marks
    FROM exam_series series WHERE tenant_id = $1 AND id = $2::uuid FOR UPDATE`, [tenantId, examId]);
  if (!result.rows[0]) throw new NotFoundException('Exam cycle was not found for this school.');
  return result.rows[0];
}

export async function validateExamSelection(operations: AdminCommandOperationsService, tenantId: string,
  subjects: string[], classes: string[], termId?: string | null) {
  const result = await operations.readSql(`SELECT
    (SELECT COUNT(*)::int FROM subjects WHERE tenant_id = $1 AND id::text = ANY($2::text[])) AS subjects,
    (SELECT COUNT(*)::int FROM class_sections WHERE tenant_id = $1 AND id::text = ANY($3::text[])
      AND LOWER(COALESCE(status, 'active')) = 'active') AS classes,
    ($4::text IS NULL OR EXISTS (SELECT 1 FROM academic_terms WHERE tenant_id = $1 AND id::text = $4)) AS valid_term`,
  [tenantId, subjects, classes, termId || null]);
  const row = result.rows[0];
  if (!row || row.subjects !== subjects.length || row.classes !== classes.length || !row.valid_term) {
    throw new BadRequestException('Choose subjects, active classes and an academic term belonging to this school.');
  }
}

export const EXAM_RECORD_COUNTS_SQL = `SELECT
  (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1 AND exam_series_id = $2::uuid) AS marks_count,
  (SELECT COUNT(*)::int FROM student_report_cards WHERE tenant_id = $1 AND exam_series_id = $2::uuid)
    + (SELECT COUNT(*)::int FROM exam_result_snapshots WHERE tenant_id = $1 AND exam_series_id = $2::uuid)
    + (SELECT COUNT(*)::int FROM report_card_generation_batches WHERE tenant_id = $1 AND exam_series_id = $2::uuid) AS reports_count,
  (SELECT COUNT(*)::int FROM exam_student_cases WHERE tenant_id = $1 AND exam_series_id = $2::uuid)
    + (SELECT COUNT(*)::int FROM academic_interventions WHERE tenant_id = $1 AND exam_series_id = $2::uuid)
    + (SELECT COUNT(*)::int FROM exam_attendance_records attendance
       JOIN exam_timetable_slots slot ON slot.tenant_id = attendance.tenant_id AND slot.id = attendance.timetable_slot_id
       WHERE slot.tenant_id = $1 AND slot.exam_series_id = $2::uuid) AS other_records_count`;

export function examDeletionBlock(exam: Record<string, any>): string | null {
  if (Number(exam.marks_count) > 0) return 'This exam has entered results, including saved drafts or absence records, and cannot be deleted.';
  if (Number(exam.reports_count) > 0) return 'This exam has results or report cards in progress and cannot be deleted.';
  if (Number(exam.other_records_count) > 0) return 'This exam has attendance, student cases or interventions and cannot be deleted.';
  if (exam.published_at || ['published', 'archived'].includes(String(exam.status).toLowerCase())) {
    return 'Published or archived exams cannot be deleted.';
  }
  return null;
}

export async function reconcileExamScope(operations: AdminCommandOperationsService, tenantId: string, examId: string,
  subjects: string[], classes: string[], maxMarks: number, termId: string | null, gradingId: string | null) {
  const multiplePapers = await operations.readSql(`SELECT subject_id FROM exam_assessments WHERE tenant_id = $1 AND exam_series_id = $2::uuid
    GROUP BY subject_id HAVING COUNT(*) > 1 AND
      (SELECT MAX(max_score) FROM exam_assessments WHERE tenant_id = $1 AND exam_series_id = $2::uuid) <> $3::numeric LIMIT 1`, [tenantId, examId, maxMarks]);
  if (multiplePapers.rowCount) throw new ConflictException('This exam has multiple papers. Change each paper maximum in assessment setup.');
  const protectedRows = await operations.readSql(`SELECT 1 FROM exam_marks mark
    JOIN exam_series series ON series.tenant_id = mark.tenant_id AND series.id = mark.exam_series_id
    JOIN exam_assessments assessment ON assessment.tenant_id = mark.tenant_id AND assessment.id = mark.assessment_id
    WHERE mark.tenant_id = $1 AND mark.exam_series_id = $2::uuid AND (
      NOT (mark.subject_id::text = ANY($3::text[])) OR NOT (mark.class_section_id::text = ANY($4::text[]))
      OR (SELECT MAX(paper.max_score) FROM exam_assessments paper WHERE paper.tenant_id = $1 AND paper.exam_series_id = $2::uuid) <> $5::numeric
      OR ($6::text IS NOT NULL AND series.academic_term_id::text IS DISTINCT FROM $6)
      OR ($7::text IS NOT NULL AND series.grading_system_id::text IS DISTINCT FROM $7)
    ) LIMIT 1`, [tenantId, examId, subjects, classes, maxMarks, termId, gradingId]);
  if (protectedRows.rowCount) throw new ConflictException('Entered results must be preserved. You cannot remove their subjects or classes, or change their term, grading system or maximum marks.');

  const scheduled = await operations.readSql(`SELECT 1 FROM exam_timetable_slots slot
    JOIN exam_assessments assessment ON assessment.tenant_id = slot.tenant_id AND assessment.id = slot.assessment_id
    WHERE slot.tenant_id = $1 AND slot.exam_series_id = $2::uuid
      AND NOT (assessment.subject_id::text = ANY($3::text[])) LIMIT 1`, [tenantId, examId, subjects]);
  if (scheduled.rowCount) throw new ConflictException('Remove timetable slots for unchecked subjects before changing this exam configuration.');

  await operations.writeSql(`DELETE FROM exam_mark_entry_windows WHERE tenant_id = $1 AND exam_series_id = $2::uuid
    AND (NOT (subject_id::text = ANY($3::text[])) OR NOT (class_section_id::text = ANY($4::text[])))`, [tenantId, examId, subjects, classes]);
  await operations.writeSql(`DELETE FROM exam_assessment_components component USING exam_assessments assessment
    WHERE component.tenant_id = $1 AND assessment.tenant_id = component.tenant_id AND assessment.id = component.assessment_id
      AND assessment.exam_series_id = $2::uuid AND NOT (assessment.subject_id::text = ANY($3::text[]))`, [tenantId, examId, subjects]);
  await operations.writeSql(`DELETE FROM exam_assessments WHERE tenant_id = $1 AND exam_series_id = $2::uuid
    AND NOT (subject_id::text = ANY($3::text[]))`, [tenantId, examId, subjects]);
}

export async function deleteExamSetupRecords(operations: AdminCommandOperationsService, tenantId: string, examId: string) {
  await operations.writeSql(`DELETE FROM exam_invigilators item USING exam_timetable_slots slot
    WHERE item.tenant_id = $1 AND slot.tenant_id = item.tenant_id AND slot.id = item.timetable_slot_id AND slot.exam_series_id = $2::uuid`, [tenantId, examId]);
  await operations.writeSql(`DELETE FROM exam_assessment_components item USING exam_assessments assessment
    WHERE item.tenant_id = $1 AND assessment.tenant_id = item.tenant_id AND assessment.id = item.assessment_id AND assessment.exam_series_id = $2::uuid`, [tenantId, examId]);
  for (const table of ['exam_grading_policy_boundaries', 'exam_subject_weightings', 'exam_competency_outcomes']) {
    await operations.writeSql(`DELETE FROM ${table} item USING exam_grading_policies policy
      WHERE item.tenant_id = $1 AND policy.tenant_id = item.tenant_id AND policy.id = item.grading_policy_id AND policy.exam_series_id = $2::uuid`, [tenantId, examId]);
  }
  for (const table of ['exam_timetable_slots', 'exam_mark_entry_windows', 'exam_assessments', 'exam_grade_boundaries', 'exam_grading_policies']) {
    await operations.writeSql(`DELETE FROM ${table} WHERE tenant_id = $1 AND exam_series_id = $2::uuid`, [tenantId, examId]);
  }
  await operations.writeSql('DELETE FROM exam_series WHERE tenant_id = $1 AND id = $2::uuid', [tenantId, examId]);
}
