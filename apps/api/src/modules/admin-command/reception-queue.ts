export const RECEPTION_QUEUE_SQL = `
  SELECT id::text, title, message, status, payload, created_at
  FROM workflow_events WHERE tenant_id=$1 AND event_type='frontoffice.queue_entry'
`;

type ReceptionRow = { id: string; title: string; message: string; status: string;
  payload?: Record<string, unknown>; created_at: string | Date };

export function receptionEntry(row: ReceptionRow, now = Date.now()) {
  const payload = row.payload ?? {};
  const arrived = new Date(row.created_at);
  const status = row.status.toLowerCase();
  return {
    id: row.id, ticket_number: `REC-${row.id.slice(0, 8).toUpperCase()}`,
    visitor_name: String(payload.visitor_name ?? row.title),
    role_relationship: String(payload.role_relationship ?? payload.relationship ?? ''),
    purpose: String(payload.purpose ?? row.message),
    person_to_see: String(payload.person_to_see ?? payload.target_role ?? ''),
    arrival_time: arrived.toISOString(),
    wait_time_minutes: Math.max(0, Math.floor((now - arrived.getTime()) / 60_000)),
    status: ['pending','waiting'].includes(status) ? 'Waiting' : status === 'called' ? 'Being Served'
      : status === 'completed' ? 'Completed' : status === 'no_show' ? 'No Show' : status,
  };
}
