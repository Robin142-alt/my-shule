import { BadRequestException } from '@nestjs/common';

export const LIBRARY_REPORT_TITLES: Record<string, string> = {
  circulation: 'Circulation Report', overdue: 'Overdue Books Report', inventory: 'Book Inventory Report',
  fines: 'Fines & Collections Report', borrower_activity: 'Borrower Activity Report',
  most_borrowed: 'Most Borrowed Books', stock_status: 'Stock Status Report',
};
export const LIBRARY_SNAPSHOT_TYPES = new Set(['inventory', 'stock_status', 'overdue']);
type Query = (sql: string, params: unknown[]) => Promise<{ rows: any[] }>;

export async function libraryReportPeriod(query: Query, tenantId: string, period: string) {
  if (!['today', 'this_week', 'this_month', 'this_term', 'this_year'].includes(period)) {
    throw new BadRequestException('Select a valid report period.');
  }
  const result = await query(`
    WITH clock AS (SELECT (NOW() AT TIME ZONE 'Africa/Nairobi')::date AS today)
    SELECT CASE $2
      WHEN 'today' THEN today
      WHEN 'this_week' THEN date_trunc('week', today)::date
      WHEN 'this_month' THEN date_trunc('month', today)::date
      WHEN 'this_year' THEN date_trunc('year', today)::date
      WHEN 'this_term' THEN (SELECT starts_on FROM academic_terms
        WHERE tenant_id = $1 AND today BETWEEN starts_on AND ends_on
        ORDER BY starts_on DESC LIMIT 1)
      END::text AS start_date,
      (today + 1)::text AS end_date
    FROM clock
  `, [tenantId, period]);
  const range = result.rows[0];
  if (!range?.start_date) {
    throw new BadRequestException('No school term covers today. Configure term dates in Academic Setup or select another period.');
  }
  return range as { start_date: string; end_date: string };
}

// These reports count the complete ledger, including loans that have already been returned.
export async function libraryActivityReport(query: Query, tenantId: string, type: string, range: { start_date: string; end_date: string }) {
  const result = await query(`
    SELECT ledger.id::text, ledger.action, ledger.created_at::text AS recorded_at,
      item.id::text AS book_id, item.title AS book_title, copy.accession_number,
      borrower.id::text AS borrower_id,
      COALESCE(NULLIF(CONCAT_WS(' ', student.first_name, student.last_name), ''),
        staff.display_name, borrower.scan_code, borrower.subject_id::text, 'Unlinked borrower') AS borrower_name,
      COALESCE(student.admission_number, staff.staff_number, borrower.scan_code, '') AS borrower_reference,
      ledger.metadata->>'due_on' AS due_date
    FROM library_circulation_ledger ledger
    LEFT JOIN library_copies copy ON copy.tenant_id = ledger.tenant_id AND copy.id = ledger.copy_id
    LEFT JOIN library_catalog_items item ON item.tenant_id = copy.tenant_id AND item.id = copy.catalog_item_id
    LEFT JOIN library_borrowers borrower ON borrower.tenant_id = ledger.tenant_id AND borrower.id = ledger.borrower_id
    LEFT JOIN students student ON student.tenant_id = borrower.tenant_id
      AND student.id::text = borrower.subject_id::text AND borrower.borrower_type = 'student'
    LEFT JOIN staff_profiles staff ON staff.tenant_id = borrower.tenant_id
      AND staff.id::text = borrower.subject_id::text AND borrower.borrower_type = 'staff'
    WHERE ledger.tenant_id = $1
      AND ledger.created_at >= ($2::date::timestamp AT TIME ZONE 'Africa/Nairobi')
      AND ledger.created_at < ($3::date::timestamp AT TIME ZONE 'Africa/Nairobi')
      AND ledger.action IN ('issue', 'return', 'renew')
    ORDER BY ledger.created_at DESC, ledger.id
  `, [tenantId, range.start_date, range.end_date]);
  if (type === 'circulation') return result.rows;
  const grouped = new Map<string, Record<string, any>>();
  for (const row of result.rows) {
    if (type === 'most_borrowed' && row.action !== 'issue') continue;
    const key = type === 'most_borrowed' ? row.book_id ?? row.accession_number : row.borrower_id;
    const group = grouped.get(key) ?? (type === 'most_borrowed'
      ? { book_title: row.book_title ?? 'Unlinked title', times_borrowed: 0 }
      : { borrower_name: row.borrower_name, borrower_reference: row.borrower_reference, issues: 0, returns: 0, renewals: 0 });
    if (type === 'most_borrowed') group.times_borrowed += 1;
    else group[row.action === 'issue' ? 'issues' : row.action === 'return' ? 'returns' : 'renewals'] += 1;
    grouped.set(key, group);
  }
  return [...grouped.values()].sort((a, b) => (b.times_borrowed ?? b.issues) - (a.times_borrowed ?? a.issues));
}
