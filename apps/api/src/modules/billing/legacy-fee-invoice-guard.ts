import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/** Called under the school billing lock, also used by legacy adoption. */
export async function assertNoUnadoptedLegacyCharges(db: PrismaService, tenant: string, structure: string, students: string[]) {
  if (!(await db.query("SELECT to_regclass('student_invoices') AS legacy_table")).rows[0]?.legacy_table) return;
  const result = await db.query(`SELECT l.id FROM student_invoices l
    WHERE l.tenant_id::text=$1 AND l.fee_structure_id::text=$2 AND l.student_id::text=ANY($3::text[])
      AND lower(COALESCE(to_jsonb(l)->>'status','open')) NOT IN ('cancelled','canceled','void','uncollectible')
      AND NOT EXISTS (SELECT 1 FROM legacy_fee_invoice_adoptions a WHERE a.tenant_id=$1 AND a.legacy_id=l.id::text)
    LIMIT 1`, [tenant, structure, students]);
  if (result.rows.length) throw new ConflictException('Historical invoices already exist for this fee structure. Review and adopt them from Historical invoices before billing these learners again.');
}
