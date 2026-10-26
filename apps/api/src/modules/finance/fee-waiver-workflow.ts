import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

export interface FeeWaiverTransaction {
  $queryRawUnsafe: <T = unknown[]>(sql: string, ...params: unknown[]) => Promise<T>;
}
export type FeeWaiverRequest = {
  schoolId: string; userId: string; studentId: string; amountMinor: string; reason: string; key: string;
};

export async function requestSchoolFeeWaiver(tx: FeeWaiverTransaction, input: FeeWaiverRequest) {
  const amount = positiveMinor(input.amountMinor);
  // Serialize retries for this request without locking another school's records.
  await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text', `${input.schoolId}:fee-waiver:${input.userId}:${input.key}`);
  const key = `fee-waiver:${input.userId}:${input.key}`;
  const existing = await tx.$queryRawUnsafe<Array<{ id: string; record_id: string; reason: string; status: string; metadata: Record<string, string> }>>(
    `SELECT id::text, record_id, reason, status, metadata FROM dashboard_approval_requests WHERE tenant_id = $1 AND approval_key = $2`, input.schoolId, key,
  );
  if (existing[0]) {
    const saved = existing[0];
    if (saved.record_id !== input.studentId || saved.metadata.amount_minor !== input.amountMinor || saved.reason !== input.reason) {
      throw new ConflictException('This reference already belongs to a different waiver request. Retry the original details.');
    }
    return { id: saved.id, created: false, status: saved.status };
  }
  const students = await tx.$queryRawUnsafe<Array<{ name: string }>>(`
    SELECT CONCAT(first_name, ' ', last_name) AS name FROM students WHERE tenant_id = $1 AND id::text = $2 AND deleted_at IS NULL
  `, input.schoolId, input.studentId);
  if (!students[0]) throw new NotFoundException('Learner was not found in this school');
  const balances = await tx.$queryRawUnsafe<Array<{ balance: string }>>(`
    SELECT COALESCE(SUM(GREATEST(total_amount_minor - amount_paid_minor, 0)), 0)::text AS balance
    FROM invoices WHERE tenant_id = $1 AND metadata->>'student_id' = $2 AND status IN ('open','pending_payment')
  `, input.schoolId, input.studentId);
  if (amount > BigInt(balances[0]?.balance ?? '0')) throw new BadRequestException('The waiver exceeds the learner’s outstanding invoices. Check the current statement.');
  const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(`
    INSERT INTO dashboard_approval_requests (tenant_id, approval_key, requested_by_user_id, approver_role,
      module, record_id, approval_type, reason, status, metadata)
    VALUES ($1,$2,$3::uuid,'principal','finance',$4,'fee_waiver',$5,'PENDING',$6::jsonb)
    RETURNING id::text
  `, input.schoolId, key, input.userId, input.studentId, input.reason, JSON.stringify({
    title: `Fee waiver · KES ${amount / 100n}.${String(amount % 100n).padStart(2, '0')} · ${students[0].name}`, student_name: students[0].name, amount_minor: input.amountMinor,
    source_dashboard: 'accountant-waivers',
  }));
  return { id: rows[0].id, created: true, status: 'PENDING' };
}

/** Called inside the governed approval transaction; never records a payment or receipt. */
export async function applySchoolFeeWaiver(tx: FeeWaiverTransaction, input: {
  schoolId: string; approvalId: string; actorUserId: string; actorRole: string; approved: boolean;
}) {
  if (input.actorRole !== 'principal') throw new ForbiddenException('Only the Principal can decide a fee waiver');
  const requests = await tx.$queryRawUnsafe<Array<{ record_id: string; requested_by_user_id: string; reason: string; metadata: Record<string, unknown> }>>(`
    SELECT record_id, requested_by_user_id::text, reason, metadata FROM dashboard_approval_requests
    WHERE tenant_id = $1 AND id::text = $2 AND module = 'finance' AND approval_type = 'fee_waiver'
      AND upper(status) IN ('PENDING','PENDING_APPROVAL','ESCALATED','CHANGES_REQUESTED') FOR UPDATE
  `, input.schoolId, input.approvalId);
  const request = requests[0];
  if (!request) throw new NotFoundException('Pending fee waiver was not found in this school');
  if (!request.requested_by_user_id || request.requested_by_user_id === input.actorUserId) throw new ForbiddenException('A different person must approve this fee waiver');
  if (!input.approved) return request;
  let remaining = positiveMinor(String(request.metadata.amount_minor ?? ''));
  const invoices = await tx.$queryRawUnsafe<Array<{ id: string; total_amount_minor: string; subtotal_amount_minor: string; amount_paid_minor: string }>>(`
    SELECT id::text, total_amount_minor::text, subtotal_amount_minor::text, amount_paid_minor::text FROM invoices
    WHERE tenant_id = $1 AND metadata->>'student_id' = $2 AND status IN ('open','pending_payment')
    ORDER BY issued_at, id FOR UPDATE
  `, input.schoolId, request.record_id);
  const available = invoices.reduce((sum, invoice) => sum + BigInt(invoice.total_amount_minor) - BigInt(invoice.amount_paid_minor), 0n);
  if (remaining > available) throw new ConflictException('The outstanding balance changed. Reject this request and submit a revised waiver amount.');
  for (const invoice of invoices) {
    if (!remaining) break;
    const balance = BigInt(invoice.total_amount_minor) - BigInt(invoice.amount_paid_minor);
    if (balance <= 0n) continue;
    const reduction = remaining < balance ? remaining : balance;
    if (reduction > BigInt(invoice.subtotal_amount_minor)) throw new ConflictException('This invoice includes tax that requires an administrator-reviewed adjustment.');
    await tx.$queryRawUnsafe(`
      UPDATE invoices SET total_amount_minor = total_amount_minor - $3::bigint,
        subtotal_amount_minor = subtotal_amount_minor - $3::bigint,
        status = CASE WHEN total_amount_minor - $3::bigint = amount_paid_minor THEN 'paid' ELSE status END,
        metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{fee_waivers}',
          COALESCE(metadata->'fee_waivers', '[]'::jsonb) || $4::jsonb), updated_at = NOW()
      WHERE tenant_id = $1 AND id::text = $2 RETURNING id
    `, input.schoolId, invoice.id, reduction.toString(), JSON.stringify([{
      approval_id: input.approvalId, amount_minor: reduction.toString(), reason: request.reason,
      approved_by: input.actorUserId, applied_at: new Date().toISOString(),
    }]));
    remaining -= reduction;
  }
  return request;
}

function positiveMinor(value: string) {
  if (!/^[1-9][0-9]*$/.test(value) || BigInt(value) > 9_223_372_036_854_775_807n) throw new BadRequestException('Enter a valid positive waiver amount');
  return BigInt(value);
}
