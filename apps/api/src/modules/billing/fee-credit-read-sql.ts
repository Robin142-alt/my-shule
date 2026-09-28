/** Credits come from allocation records, never from the full amount of a
 * receipt that has already paid invoices. Retain pre-allocation legacy credits.
 */
export const FEE_CREDIT_READ_SQL = `
  SELECT allocation.tenant_id,allocation.student_id::text AS student_id,allocation.amount_minor
  FROM manual_fee_payment_allocations allocation
  JOIN manual_fee_payments payment ON payment.tenant_id=allocation.tenant_id AND payment.id=allocation.manual_payment_id
  WHERE allocation.tenant_id=current_setting('app.tenant_id',true)
    AND allocation.allocation_type='credit' AND payment.status='cleared'
  UNION ALL
  SELECT payment.tenant_id,payment.student_id::text,payment.amount_minor
  FROM manual_fee_payments payment WHERE payment.tenant_id=current_setting('app.tenant_id',true)
    AND payment.status='cleared' AND payment.invoice_id IS NULL AND payment.student_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM manual_fee_payment_allocations allocation
      WHERE allocation.tenant_id=payment.tenant_id AND allocation.manual_payment_id=payment.id)
  UNION ALL
  SELECT credit.tenant_id,credit.student_id::text,credit.remaining_amount_minor
  FROM student_fee_credits credit WHERE credit.tenant_id=current_setting('app.tenant_id',true)
    AND credit.remaining_amount_minor>0
`;

export const STUDENT_FEE_CREDIT_SQL = `(SELECT COALESCE(SUM(credit.amount_minor),0)
  FROM (${FEE_CREDIT_READ_SQL}) credit WHERE credit.tenant_id=$1 AND credit.student_id=student.id::text)`;

// Both aggregate queries must page the same student set. Paging invoices and
// credits independently can silently omit a student's credit at a page boundary.
export const FEE_BALANCE_STUDENT_PAGE_SQL = `SELECT student_id FROM (
  SELECT metadata->>'student_id' AS student_id FROM invoices WHERE tenant_id=$1
    AND status NOT IN ('draft','void','uncollectible')
  UNION SELECT student_id FROM (${FEE_CREDIT_READ_SQL}) credits WHERE tenant_id=$1
) students WHERE NULLIF(student_id,'') IS NOT NULL
ORDER BY student_id LIMIT $2::integer OFFSET $3::integer`;
