import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CollectionMatch {
  student_id: string | null;
  invoice_id: string | null;
  reason: 'invoice_reference' | 'student_admission_number' | 'ambiguous_invoice_reference' | 'ambiguous_admission_number' | 'unmatched_reference';
}

@Injectable()
export class CollectionReferenceMatcher {
  constructor(private readonly db: PrismaService) {}
  async match(tenant: string, reference: string): Promise<CollectionMatch> {
    const empty = { student_id: null, invoice_id: null };
    const ref = reference.trim();
    if (!ref) return { ...empty, reason: 'unmatched_reference' };
    const invoices = await this.db.query<{ id: string; student_id: string; balance: string }>(
      `SELECT i.id,i.metadata->>'student_id' AS student_id,(i.total_amount_minor-i.amount_paid_minor)::text AS balance
       FROM invoices i JOIN students s ON s.tenant_id=i.tenant_id AND s.id::text=i.metadata->>'student_id'
       WHERE i.tenant_id=$1 AND i.status IN ('open','pending_payment','paid')
         AND (i.invoice_number=$2 OR i.metadata->>'external_reference'=$2 OR i.metadata->>'account_reference'=$2 OR i.id::text=$2)
       ORDER BY i.id LIMIT 2`, [tenant, ref]);
    if (invoices.rows.length > 1) return { ...empty, reason: 'ambiguous_invoice_reference' };
    if (invoices.rows.length === 1) {
      const invoice = invoices.rows[0];
      return { student_id: invoice.student_id, invoice_id: BigInt(invoice.balance) > 0n ? invoice.id : null, reason: 'invoice_reference' };
    }
    const students = await this.db.query<{ id: string }>(
      `SELECT id::text AS id FROM students WHERE tenant_id=$1 AND admission_number=$2 AND status='active' ORDER BY id LIMIT 2`, [tenant, ref]);
    if (students.rows.length > 1) return { ...empty, reason: 'ambiguous_admission_number' };
    return students.rows.length === 1
      ? { student_id: students.rows[0].id, invoice_id: null, reason: 'student_admission_number' }
      : { ...empty, reason: 'unmatched_reference' };
  }
}
