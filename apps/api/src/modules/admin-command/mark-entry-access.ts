import { BadRequestException, ConflictException } from '@nestjs/common';
import type { AdminCommandOperationsService } from './admin-command-operations.service';
import type { OpenMarkEntryDto } from './open-mark-entry.dto';
import { lockExam } from './exam-setup-integrity';

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
  if (exam.locked_at || exam.published_at || ['locked', 'published', 'archived'].includes(exam.status)) {
    throw new ConflictException('This exam is locked or published. Use the approved correction workflow.');
  }
  if (exam.status === 'draft') throw new ConflictException('Finish Exam Setup and open the exam for marks before granting entry access.');
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
    teacher_user_ids: recipients.rows.map(row => String(row.teacher_user_id)), ...input };
}
