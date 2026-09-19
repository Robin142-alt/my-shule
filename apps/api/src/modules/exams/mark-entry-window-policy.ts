// Exam Setup stores "Open for marks" as a submitted series. Older setup writes
// left opens_at at the future exam date without recording an explicit open action.
// Honor that saved intent while keeping explicit locks and deadlines enforced by
// the caller. Use the same rule for discovery, roster reads and transactional saves.
export function markEntryHasStartedSql(windowAlias: string, seriesAlias: string): string {
  return `(${windowAlias}.opens_at <= NOW() OR ${windowAlias}.last_action = 'opened'
    OR (${seriesAlias}.status = 'submitted' AND ${windowAlias}.last_action IS NULL))`;
}

// A teacher-specific extension adds access without opening a closed class window
// for other teachers. Assignment and immutable-result checks remain mandatory.
export function teacherEntryDeadlineSql(window: string, teacher: string): string {
  return `NULLIF(to_jsonb(${window})->'teacher_entry_deadlines'->>(${teacher})::text, '')::timestamptz`;
}

export function markEntryAccessSql(window: string, series: string, teacher: string): string {
  return `((${window}.status = 'open' AND ${markEntryHasStartedSql(window, series)} AND ${window}.closes_at >= NOW())
    OR ${teacherEntryDeadlineSql(window, teacher)} >= NOW())`;
}

export function effectiveEntryDeadlineSql(window: string, teacher: string): string {
  return `COALESCE(GREATEST(CASE WHEN ${window}.status = 'open' THEN ${window}.closes_at END,
    ${teacherEntryDeadlineSql(window, teacher)}), ${window}.closes_at)`;
}
