import { Client } from 'pg';
import { TEACHER_MARK_PROGRESS_SQL } from '../apps/api/src/modules/admin-command/teacher-mark-progress';
import { examRosterSql } from '../apps/api/src/modules/exams/exam-mark-roster';

// Intentionally no repair mode: progress is calculated from authoritative records.
// Ambiguous history needs school review, never guessed scores or silent deletions.
export async function auditExamMarkRosters(client: Pick<Client, 'query'>, tenantId: string) {
  if (!tenantId.trim()) throw new Error('An explicit school tenant ID is required');
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query('SET LOCAL ROLE shule_hub_runtime');
    await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenantId]);
    const progress = (await client.query(TEACHER_MARK_PROGRESS_SQL, [tenantId])).rows;
    const evidence = (await client.query(`WITH rosters AS MATERIALIZED (
      SELECT w.id AS window_id,w.exam_series_id,w.class_section_id,w.subject_id,roster.*
      FROM exam_mark_entry_windows w JOIN exam_series series ON series.tenant_id=w.tenant_id AND series.id=w.exam_series_id
      JOIN LATERAL (${examRosterSql('w','series')}) roster ON TRUE WHERE w.tenant_id=$1
    ) SELECT
      (SELECT COUNT(*)::int FROM rosters WHERE eligibility_source='historical_mark') AS historical_mark_memberships,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('mark_id',mark.id,'exam_id',mark.exam_series_id,
        'class_id',mark.class_section_id,'subject_id',mark.subject_id,'student_id',mark.student_id)), '[]'::jsonb)
        FROM exam_marks mark WHERE mark.tenant_id=$1 AND NOT EXISTS (
          SELECT 1 FROM rosters r WHERE r.exam_series_id=mark.exam_series_id AND r.class_section_id=mark.class_section_id
            AND r.subject_id=mark.subject_id AND r.student_id=mark.student_id::text)) AS marks_requiring_roster_review,
      (SELECT COALESCE(jsonb_agg(duplicate), '[]'::jsonb) FROM (
        SELECT student_id,class_section_id,COUNT(*)::int AS memberships,
          COUNT(DISTINCT COALESCE(stream_id,'__unstreamed__'))::int AS streams
        FROM student_class_assignments WHERE tenant_id=$1 AND status='active'
        GROUP BY student_id,class_section_id HAVING COUNT(DISTINCT COALESCE(stream_id,'__unstreamed__'))>1
      ) duplicate) AS ambiguous_active_streams,
      (SELECT COUNT(*)::int FROM student_subject_enrollments WHERE tenant_id=$1 AND status='completed'
        AND to_jsonb(student_subject_enrollments)->>'effective_to' IS NULL) AS legacy_completion_dates
    `, [tenantId])).rows[0];
    const fingerprints: Record<string, unknown> = {};
    // Fixed repository-owned identifiers; never interpolate CLI input as SQL.
    for (const table of ['exam_marks','student_report_cards','exam_result_snapshots']) {
      fingerprints[table] = (await client.query(`SELECT COUNT(*)::int AS records,
        md5(COALESCE(string_agg(md5(to_jsonb(record)::text),'' ORDER BY record.id),'')) AS fingerprint
        FROM ${table} record WHERE record.tenant_id=$1`, [tenantId])).rows[0];
    }
    return { tenant_id: tenantId, audited_at: new Date().toISOString(), mode: 'read_only',
      changed_scores: 0, changed_reports: 0, progress, review: evidence, fingerprints };
  } finally { await client.query('ROLLBACK'); }
}

async function main() {
  const tenantId = process.argv[2];
  if (!tenantId || !process.env.MARKS_AUDIT_DATABASE_URL) {
    throw new Error('Usage: set MARKS_AUDIT_DATABASE_URL, then run audit-exam-mark-rosters.ts <tenant-id>');
  }
  const client = new Client({ connectionString: process.env.MARKS_AUDIT_DATABASE_URL,
    connectionTimeoutMillis: 15_000, options: '-c default_transaction_read_only=on -c statement_timeout=60000' });
  await client.connect();
  try { process.stdout.write(`${JSON.stringify(await auditExamMarkRosters(client, tenantId), null, 2)}\n`); }
  finally { await client.end(); }
}
if (require.main === module) main().catch(error => {
  // Do not expose connection URLs or credentials in operator logs.
  console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[database connection]'));
  process.exitCode = 1;
});
