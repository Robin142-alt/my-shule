import { markEntryAccessSql } from './mark-entry-window-policy';

/** Repository-owned aliases only. Reasons may change after submission, never after moderation/release. */
export function missingReasonEditableSql(window: string, series: string, mark: string, student: string, teacher: string) {
  return `(${series}.locked_at IS NULL AND ${series}.published_at IS NULL
    AND ${series}.status NOT IN ('locked','published','archived')
    AND ${markEntryAccessSql(window, series, teacher)}
    AND ${mark}.score IS NULL AND COALESCE(${mark}.status,'draft') IN ('draft','submitted')
    AND (${teacher}::uuid IS NULL OR ${mark}.id IS NULL
      OR COALESCE(${mark}.assigned_teacher_user_id,${mark}.entered_by_user_id)=${teacher}::uuid
      OR (${mark}.assigned_teacher_user_id IS NULL AND EXISTS (
        SELECT 1 FROM exam_mark_audit_logs origin WHERE origin.tenant_id=${mark}.tenant_id
          AND origin.mark_id=${mark}.id AND origin.action='grade.created'
          AND origin.actor_user_id=${mark}.entered_by_user_id
          AND origin.metadata->>'source'='exams_manager_mark_sheet')))
    AND NOT EXISTS (SELECT 1 FROM student_report_cards card WHERE card.tenant_id=${window}.tenant_id
      AND card.exam_series_id=${window}.exam_series_id AND card.student_id::text=${student}::text
      AND card.is_current=TRUE AND card.status IN ('submitted','approved','published'))) `;
}
