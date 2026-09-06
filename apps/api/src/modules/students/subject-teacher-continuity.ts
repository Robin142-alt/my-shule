import { ConflictException } from '@nestjs/common';
import type { EventPublisherService } from '../events/event-publisher.service';

export interface SubjectTeacherPromotion {
  tenantId: string;
  studentId: string;
  sourceClassId: string;
  sourceStreamId?: string | null;
  sourceStreamName?: string | null;
  targetClassId: string;
  targetStreamId?: string | null;
  actorUserId: string | null;
  actorRole?: string | null;
}

export interface SubjectTeacherContinuity {
  assignments: Record<string, any>[];
  endedAssignments: Record<string, any>[];
}

/** Called inside the promotion transaction after the learner's placement changes. */
export async function continueSubjectTeachersAfterPromotion(
  tx: { $queryRawUnsafe: (sql: string, ...values: any[]) => Promise<any> },
  input: SubjectTeacherPromotion,
  publisher?: Pick<EventPublisherService, 'publish'>,
): Promise<SubjectTeacherContinuity> {
  const result: SubjectTeacherContinuity = { assignments: [], endedAssignments: [] };
  if (!input.sourceClassId || input.sourceClassId === input.targetClassId) return result;
  const query = async (sql: string, values: unknown[]) => tx.$queryRawUnsafe(sql, ...values);
  // Match manual assignment locks and use a stable order across promotion chains.
  for (const classId of [input.sourceClassId, input.targetClassId].sort()) {
    await query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))::text',
      [`subject-teacher-continuity:${input.tenantId}:${classId}`]);
  }
  const scopes = await query(`
    SELECT source.id::text AS source_id, target.id::text AS target_id,
           source_stream.id::text AS source_stream_id
    FROM class_sections source
    JOIN class_sections target ON target.tenant_id = source.tenant_id AND target.id::text = $3::text
    LEFT JOIN class_streams source_stream
      ON source_stream.tenant_id = source.tenant_id
     AND source_stream.class_section_id::text = source.id::text
     AND (($4::text IS NOT NULL AND source_stream.id::text = $4::text)
       OR ($4::text IS NULL AND $5::text IS NOT NULL
         AND lower(btrim(source_stream.name)) = lower(btrim($5::text))))
    WHERE source.tenant_id = $1 AND source.id::text = $2::text
      AND target.archived_at IS NULL AND target.is_active = TRUE
      AND ($6::text IS NULL OR EXISTS (
        SELECT 1 FROM class_streams target_stream
        WHERE target_stream.tenant_id = $1 AND target_stream.class_section_id::text = target.id::text
          AND target_stream.id::text = $6::text AND target_stream.archived_at IS NULL
          AND target_stream.is_active = TRUE))
  `, [input.tenantId, input.sourceClassId, input.targetClassId, input.sourceStreamId ?? null,
    input.sourceStreamName || null, input.targetStreamId ?? null]);
  // Legacy class IDs do not grant access to canonical academic classes with similar names.
  if (!scopes.length) return result;
  const sourceStreamId = scopes[0].source_stream_id ?? null;
  if ((input.sourceStreamId || input.sourceStreamName) && !sourceStreamId) return result;

  const sources = await query(`
    SELECT assignment.* FROM teacher_subject_assignments assignment
    JOIN subjects subject ON subject.tenant_id = assignment.tenant_id
      AND subject.id::text = assignment.subject_id::text AND subject.status = 'active'
    WHERE assignment.tenant_id = $1 AND assignment.class_section_id::text = $2::text
      AND assignment.academic_term_id IS NULL AND assignment.status = 'active'
      AND assignment.effective_from <= CURRENT_DATE AND assignment.effective_to IS NULL
      AND assignment.assignment_type <> 'temporary'
      AND (assignment.stream_id IS NULL OR assignment.stream_id::text = $3::text)
      AND EXISTS (SELECT 1 FROM tenant_memberships member
        WHERE member.tenant_id = assignment.tenant_id
          AND member.user_id::text = assignment.teacher_user_id::text AND member.status = 'active')
    ORDER BY assignment.stream_id NULLS LAST, assignment.updated_at DESC
    FOR UPDATE OF assignment
  `, [input.tenantId, input.sourceClassId, sourceStreamId]);

  for (const source of sources) {
    if (source.stream_id == null && source.is_primary !== false && sources.some((row: any) =>
      row.stream_id != null && row.is_primary !== false && String(row.subject_id) === String(source.subject_id))) {
      continue;
    }
    const targetStreamId = input.targetStreamId ?? null;
    const destination = await query(`
      SELECT * FROM teacher_subject_assignments
      WHERE tenant_id = $1 AND class_section_id::text = $2::text AND subject_id::text = $3::text
        AND status = 'active' AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        AND (stream_id IS NULL OR $4::text IS NULL OR stream_id::text = $4::text)
        AND (is_primary = TRUE OR teacher_user_id::text = $5::text)
      FOR UPDATE
    `, [input.tenantId, input.targetClassId, source.subject_id, targetStreamId, source.teacher_user_id]);
    const relevant = destination.filter((row: any) => source.is_primary !== false
      ? row.is_primary !== false : String(row.teacher_user_id) === String(source.teacher_user_id));
    if (relevant.some((row: any) => row.continued_from_assignment_id
      && String(row.teacher_user_id) !== String(source.teacher_user_id))) {
      throw new ConflictException('Promoted streams have different continuing subject teachers. Assign the intended subject teacher to the destination class/stream, then retry promotion.');
    }
    if (!relevant.length) {
      const created = await query(`
        INSERT INTO teacher_subject_assignments (
          tenant_id, academic_term_id, class_section_id, subject_id, teacher_user_id,
          created_by_user_id, assignment_type, is_primary, mark_entry_allowed, lesson_record_allowed,
          report_comment_allowed, effective_from, effective_to, reason, status, stream_id,
          department_id, curriculum_model, continued_from_assignment_id, updated_at
        ) VALUES ($1, NULL, $2, $3, $4, $5::uuid, $6, $7, $8, $9, $10,
          CURRENT_DATE, NULL, 'Continued with promoted learners', 'active', $11::text,
          $12::uuid, $13, $14::text, NOW()) RETURNING *
      `, [input.tenantId, input.targetClassId, source.subject_id, source.teacher_user_id,
        input.actorUserId, source.assignment_type, source.is_primary, source.mark_entry_allowed,
        source.lesson_record_allowed, source.report_comment_allowed, targetStreamId,
        source.department_id, source.curriculum_model, String(source.id)]);
      if (created[0]) {
        result.assignments.push(created[0]);
        await recordChange(created[0], source, 'continued');
        await query(`
          INSERT INTO notifications (tenant_id, notification_key, recipient_user_id,
            type, title, body, priority, source_module, source_record_id, metadata)
          VALUES ($1, $2, $3::uuid, 'academic_assignment', 'Teaching assignment continued',
            'Your subject teaching assignment has continued with the promoted learners. Open your teaching workspace to view the new class.',
            'normal', 'academics', $4::text, $5::jsonb)
          ON CONFLICT (tenant_id, notification_key) DO NOTHING RETURNING id
        `, [input.tenantId, `subject-teacher-continued:${created[0].id}`, source.teacher_user_id,
          String(created[0].id), JSON.stringify({ class_section_id: input.targetClassId,
            stream_id: targetStreamId, subject_id: source.subject_id, source_assignment_id: source.id })]);
      }
    }

    // Repeaters retain their existing teacher. Historical records and marks are untouched.
    const remaining = await query(`
      SELECT 1 FROM student_class_assignments placement
      WHERE placement.tenant_id = $1 AND placement.class_section_id::text = $2::text
        AND placement.status = 'active'
        AND ($3::text IS NULL OR placement.stream_id::text = $3::text)
      UNION ALL
      SELECT 1 FROM student_academic_enrollments enrollment
      WHERE enrollment.tenant_id = $1 AND enrollment.class_section_id::text = $2::text
        AND enrollment.status = 'active'
        AND ($3::text IS NULL OR EXISTS (
          SELECT 1 FROM class_streams stream WHERE stream.tenant_id = $1 AND stream.id::text = $3::text
            AND stream.class_section_id::text = $2::text
            AND lower(btrim(stream.name)) = lower(btrim(enrollment.stream_name))))
      LIMIT 1
    `, [input.tenantId, input.sourceClassId, source.stream_id ?? null]);
    if (!remaining.length) {
      const ended = await query(`
        UPDATE teacher_subject_assignments SET status = 'ended', effective_to = CURRENT_DATE,
          ended_by_user_id = $3::uuid, version = version + 1, updated_at = NOW()
        WHERE tenant_id = $1 AND id::text = $2::text AND status = 'active' RETURNING *
      `, [input.tenantId, String(source.id), input.actorUserId]);
      if (ended[0]) {
        result.endedAssignments.push(ended[0]);
        await recordChange(ended[0], source, 'ended_after_promotion');
      }
    }
  }
  return result;

  async function recordChange(record: Record<string, any>, source: Record<string, any>, action: string) {
    const metadata = { student_id: input.studentId, source_assignment_id: source.id,
      source_class_id: input.sourceClassId, target_class_id: input.targetClassId };
    await query(`
      INSERT INTO academic_audit_logs (school_id, tenant_id, entity_type, entity_id, action,
        actor_user_id, actor_role, previous_values, new_values, reason, metadata)
      VALUES ($1, $1, 'teacher_assignment', $2::text, $3, $4::uuid, $5, $6::jsonb, $7::jsonb,
        'Subject teacher continuity during student promotion', $8::jsonb) RETURNING id
    `, [input.tenantId, String(record.id), `academics.teacher_assignment_${action}`, input.actorUserId,
      input.actorRole ?? null, JSON.stringify(source), JSON.stringify(record), JSON.stringify(metadata)]);
    if (publisher) await publisher.publish({
      event_name: 'academic.teacher_assignment.changed',
      event_key: `academic.teacher_assignment.changed:${record.id}:${record.version ?? 1}:${action}`,
      aggregate_type: 'teacher_assignment', aggregate_id: String(record.id), tenant_id: input.tenantId,
      payload: { tenant_id: input.tenantId, entity_type: 'teacher_assignment', entity_id: String(record.id),
        action, version: Number(record.version ?? 1), occurred_at: new Date().toISOString(),
        previous_values: source, new_values: record, reason: 'Continued with promoted learners', metadata },
    }, tx);
  }
}
