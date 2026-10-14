import { BadRequestException, ConflictException } from '@nestjs/common';
import type { AdminCommandOperationsService } from './admin-command-operations.service';
import type { OpenMarkEntryDto } from './open-mark-entry.dto';
import { lockExam } from './exam-setup-integrity';
import { teacherMarkStudentScopeSql } from '../exams/teacher-mark-scope';

export function validateEntryRequest(input: OpenMarkEntryDto) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!input || !uuid.test(input.exam_series_id) || !['teacher', 'class', 'everyone'].includes(input.scope)) {
    throw new BadRequestException('Select an exam and who should have mark-entry access.');
  }
  if ((input.scope === 'teacher' && !uuid.test(input.teacher_user_id ?? ''))
    || (input.scope === 'class' && !uuid.test(input.class_section_id ?? ''))
    || (input.teacher_user_id && input.scope !== 'teacher')
    || (input.class_section_id && input.scope !== 'class')) {
    throw new BadRequestException('Select only the teacher or class matching the chosen scope.');
  }
  const deadline = new Date(input.closes_at);
  if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now()) {
    throw new BadRequestException('Choose a future mark-entry deadline.');
  }
  return { ...input, closes_at: deadline.toISOString() };
}

export async function openMarkEntry(operations: AdminCommandOperationsService, tenant: string, actor: string, input: OpenMarkEntryDto) {
  const exam = await lockExam(operations, tenant, input.exam_series_id);
  if (exam.status === 'archived') throw new ConflictException('Archived exams cannot be reopened for mark entry.');
  if (exam.status === 'draft') throw new ConflictException('Finish Exam Setup and open the exam for marks before granting entry access.');
  const wasProtected = Boolean(exam.locked_at || exam.published_at || ['locked', 'published'].includes(exam.status));
  if (wasProtected) {
    // Removing a series-wide lock must not reactivate old windows or extensions.
    // The requested scope is opened explicitly below, in this same transaction.
    await operations.writeSql(`UPDATE exam_mark_entry_windows SET status = 'closed',
      teacher_entry_deadlines = '{}'::jsonb, updated_at = NOW()
      WHERE tenant_id = $1 AND exam_series_id = $2::uuid`, [tenant, input.exam_series_id]);
    await operations.writeSql(`UPDATE exam_series SET status = 'submitted', locked_at = NULL,
      published_at = NULL, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid`, [tenant, input.exam_series_id]);
  }
  const result = await operations.writeSql(`WITH changed AS (
    UPDATE exam_mark_entry_windows w SET
      status = CASE WHEN $4 = 'teacher' THEN w.status ELSE 'open' END,
      opens_at = CASE WHEN $4 = 'teacher' THEN w.opens_at ELSE LEAST(w.opens_at, NOW()) END,
      closes_at = CASE WHEN $4 = 'teacher' THEN w.closes_at ELSE $7::timestamptz END,
      teacher_entry_deadlines = CASE WHEN $4 = 'teacher'
        THEN COALESCE(w.teacher_entry_deadlines, '{}'::jsonb) || jsonb_build_object($5::text, $7::text)
        ELSE '{}'::jsonb END,
      last_action = CASE WHEN $4 = 'teacher' THEN w.last_action ELSE 'opened' END,
      last_action_at = NOW(), last_action_by_user_id = $3::uuid, updated_at = NOW()
    WHERE w.tenant_id = $1 AND w.exam_series_id = $2::uuid
      AND ($4 <> 'class' OR w.class_section_id = $6::uuid)
      AND ($4 <> 'teacher' OR EXISTS (
        SELECT 1 FROM teacher_subject_assignments assignment
        JOIN exam_series series ON series.tenant_id = $1 AND series.id = w.exam_series_id
        WHERE assignment.tenant_id = $1 AND assignment.teacher_user_id = $5::text
          AND assignment.class_section_id = w.class_section_id::text AND assignment.subject_id = w.subject_id::text
          AND (assignment.academic_term_id IS NULL OR assignment.academic_term_id = series.academic_term_id::text)
          AND assignment.status = 'active' AND assignment.mark_entry_allowed = TRUE
          AND assignment.effective_from <= CURRENT_DATE
          AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
      )) RETURNING w.id, w.exam_series_id, w.class_section_id, w.subject_id
    ), audited AS (
      INSERT INTO exam_mark_audit_logs (tenant_id, exam_series_id, action, actor_user_id, metadata)
      SELECT $1, exam_series_id, 'mark_entry.opened', $3::uuid,
        jsonb_build_object('window_id', id, 'scope', $4::text, 'teacher_user_id', $5::text,
          'class_section_id', class_section_id, 'deadline', $7::text)
      FROM changed RETURNING id
    ) SELECT changed.*, (SELECT COUNT(*)::int FROM audited) AS audit_count FROM changed`,
  [tenant, input.exam_series_id, actor, input.scope, input.teacher_user_id ?? null, input.class_section_id ?? null, input.closes_at]);
  if (!result.rows.length) throw new BadRequestException('No configured mark-entry windows match this teacher or class in this exam. Check Academic Setup assignments.');
  const windowIds = result.rows.map(row => String(row.id));
  const reopened = await operations.writeSql(`WITH selected AS MATERIALIZED (
      SELECT mark.id, mark.status AS previous_status, mark.score
      FROM exam_marks mark
      JOIN exam_mark_entry_windows w ON w.tenant_id = mark.tenant_id
        AND w.exam_series_id = mark.exam_series_id AND w.class_section_id = mark.class_section_id
        AND w.subject_id = mark.subject_id
      JOIN exam_series series ON series.tenant_id = w.tenant_id AND series.id = w.exam_series_id
      WHERE mark.tenant_id = $1 AND w.id = ANY($2::uuid[])
        AND mark.status IN ('submitted', 'reviewed', 'approved', 'locked', 'published')
        AND ($4::text IS NULL OR (mark.entered_by_user_id::text = $4
          AND ${teacherMarkStudentScopeSql('w', 'series', 'mark.student_id', '$4')}))
      FOR UPDATE OF mark
    ), changed AS (
      UPDATE exam_marks mark SET status = 'draft', submitted_at = NULL, reviewed_at = NULL, locked_at = NULL,
        published_at = NULL, updated_by_user_id = $3::uuid, updated_at = NOW()
      FROM selected WHERE mark.tenant_id = $1 AND mark.id = selected.id
      RETURNING mark.*
    ), audited AS (
      INSERT INTO exam_mark_audit_logs (tenant_id, mark_id, exam_series_id, assessment_id, student_id,
        action, actor_user_id, previous_score, new_score, metadata)
      SELECT $1, mark.id, mark.exam_series_id, mark.assessment_id, mark.student_id,
        'mark_entry.reopened', $3::uuid, selected.score, mark.score,
        jsonb_build_object('previous_status', selected.previous_status, 'scope', $5::text,
          'teacher_user_id', $4::text, 'previous_exam_status', $6::text)
      FROM changed mark JOIN selected ON selected.id = mark.id RETURNING id
    ) SELECT (SELECT COUNT(*)::int FROM changed) AS reopened_marks,
      (SELECT COUNT(*)::int FROM audited) AS audit_count`,
  [tenant, windowIds, actor, input.teacher_user_id ?? null, input.scope, exam.status]);
  // A card contains all of a learner's subjects. Withdraw the current snapshot
  // for every learner in the reopened scope, even when their mark is still missing.
  const cards = await operations.writeSql(`WITH changed AS (
      UPDATE student_report_cards card SET status = 'regeneration_required',
        workflow_version = card.workflow_version + 1, updated_at = NOW(),
        metadata = card.metadata || jsonb_build_object('regeneration_reason', 'Mark entry reopened',
          'reopened_by_user_id', $3::text, 'reopened_at', NOW())
      WHERE card.tenant_id = $1 AND card.exam_series_id = $5::uuid AND card.is_current = TRUE
        AND card.status <> 'regeneration_required'
        AND EXISTS (
          SELECT 1 FROM exam_mark_entry_windows w
          JOIN exam_series series ON series.tenant_id = w.tenant_id AND series.id = w.exam_series_id
          JOIN student_class_assignments membership ON membership.tenant_id = w.tenant_id
            AND membership.class_section_id = w.class_section_id::text
            AND membership.student_id = card.student_id::text AND membership.status = 'active'
          WHERE w.tenant_id = $1 AND w.id = ANY($2::uuid[])
            AND ($4::text IS NULL OR ${teacherMarkStudentScopeSql('w', 'series', 'card.student_id', '$4')})
        ) RETURNING card.*
    ), audited AS (
      INSERT INTO student_report_card_audit_logs (tenant_id, report_card_id, exam_series_id, student_id,
        action, actor_user_id, metadata)
      SELECT $1, id, exam_series_id, student_id, 'report_card.regeneration_required', $3::uuid,
        jsonb_build_object('reason', 'Mark entry reopened', 'teacher_user_id', $4::text)
      FROM changed RETURNING id
    ) SELECT (SELECT COUNT(*)::int FROM changed) AS affected_report_cards,
      (SELECT COUNT(*)::int FROM audited) AS audit_count`,
  [tenant, windowIds, actor, input.teacher_user_id ?? null, input.exam_series_id]);
  const recipients = await operations.readSql(`SELECT DISTINCT assignment.teacher_user_id
    FROM teacher_subject_assignments assignment
    JOIN exam_mark_entry_windows w ON w.tenant_id = $1 AND w.id = ANY($2::uuid[])
      AND assignment.class_section_id = w.class_section_id::text AND assignment.subject_id = w.subject_id::text
    JOIN exam_series series ON series.tenant_id = $1 AND series.id = w.exam_series_id
    WHERE assignment.tenant_id = $1 AND assignment.status = 'active' AND assignment.mark_entry_allowed = TRUE
      AND (assignment.academic_term_id IS NULL OR assignment.academic_term_id = series.academic_term_id::text)
      AND assignment.effective_from <= CURRENT_DATE AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
      AND ($3::text IS NULL OR assignment.teacher_user_id = $3::text)`, [tenant, windowIds, input.teacher_user_id ?? null]);
  return { exam_name: String(exam.name), window_count: result.rows.length, window_ids: windowIds,
    previous_exam_status: exam.status, reopened_marks: Number(reopened.rows[0]?.reopened_marks ?? 0),
    affected_report_cards: Number(cards.rows[0]?.affected_report_cards ?? 0),
    teacher_user_ids: recipients.rows.map(row => String(row.teacher_user_id)), ...input };
}
