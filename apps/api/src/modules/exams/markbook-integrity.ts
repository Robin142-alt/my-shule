// Internal SQL identifiers only. Include the eligible roster and each saved version,
// so enrolment, paper configuration, scores and submissions invalidate stale actions.
export function markbookRevisionSql(window: string, assessment: string, student: string, mark: string) {
  const row = `CONCAT_WS(':',${student},COALESCE(${mark}.updated_at::text,''),COALESCE(${mark}.status,''))`;
  return `MD5(CONCAT_WS('|',${window}.paper_config_version::text,${assessment}::text,
    STRING_AGG(DISTINCT ${row},',' ORDER BY ${row})))`;
}

export function teacherCorrectionAccessSql(window: string, teacher: string, mark: string) {
  return `(${mark}.status IS NULL OR ${mark}.status='draft' OR ${teacherScopedReopenSql(window,teacher,
    `GREATEST(${mark}.submitted_at,${mark}.reviewed_at,${mark}.locked_at,${mark}.published_at,${mark}.created_at)`)})`;
}

export function teacherScopedReopenSql(window: string,teacher: string,after: string) {
  return `EXISTS (SELECT 1 FROM exam_mark_audit_logs grant_log
    WHERE grant_log.tenant_id=${window}.tenant_id AND grant_log.exam_series_id=${window}.exam_series_id
      AND grant_log.action='mark_entry.opened' AND grant_log.metadata->>'window_id'=${window}.id::text
      AND (grant_log.metadata->>'scope' IN ('class','everyone') OR grant_log.metadata->>'teacher_user_id'=${teacher}::text)
      AND grant_log.created_at > ${after})`;
}

export function teacherSeriesAccessSql(window: string,series: string,teacher: string) {
  return `(${series}.status<>'archived' AND ((${series}.locked_at IS NULL AND ${series}.published_at IS NULL
    AND ${series}.status NOT IN ('locked','published')) OR ${teacherScopedReopenSql(window,teacher,
      `COALESCE(GREATEST(${series}.locked_at,${series}.published_at),${series}.updated_at) `)}))`;
}
