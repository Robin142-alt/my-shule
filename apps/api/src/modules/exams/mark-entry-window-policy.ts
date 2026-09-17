// Exam Setup stores "Open for marks" as a submitted series. Older setup writes
// left opens_at at the future exam date without recording an explicit open action.
// Honor that saved intent while keeping explicit locks and deadlines enforced by
// the caller. Use the same rule for discovery, roster reads and transactional saves.
export function markEntryHasStartedSql(windowAlias: string, seriesAlias: string): string {
  return `(${windowAlias}.opens_at <= NOW() OR ${windowAlias}.last_action = 'opened'
    OR (${seriesAlias}.status = 'submitted' AND ${windowAlias}.last_action IS NULL))`;
}
