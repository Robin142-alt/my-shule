/** Shared read model for portals during adoption of the ledger-backed invoices.
 * Existing legacy invoices stay visible; a matching canonical invoice wins.
 * The enclosing query must still restrict tenant and student access.
 */
export const FEE_INVOICE_READ_SQL = `
  SELECT i.id::text,i.tenant_id,i.metadata->>'student_id' AS student_id,i.invoice_number,
    i.metadata->>'term' AS term,i.metadata->>'academic_year' AS academic_year,
    i.total_amount_minor AS amount_minor,
    GREATEST(i.total_amount_minor-i.amount_paid_minor,0) AS balance_minor,
    CASE WHEN i.status IN ('void','uncollectible') THEN 'cancelled'
      WHEN i.amount_paid_minor>=i.total_amount_minor THEN 'paid'
      WHEN i.amount_paid_minor>0 THEN 'partially_paid' ELSE 'issued' END AS status,
    i.created_at
  FROM invoices i WHERE i.tenant_id=current_setting('app.tenant_id',true)
    AND NULLIF(i.metadata->>'student_id','') IS NOT NULL AND i.status<>'draft'
  UNION ALL
  SELECT legacy.id::text,legacy.tenant_id::text,legacy.student_id::text,legacy.invoice_number,
    legacy.term::text,legacy.academic_year::text,legacy.amount_minor,legacy.balance_minor,
    COALESCE(to_jsonb(legacy)->>'status','issued'),legacy.created_at
  FROM student_invoices legacy WHERE legacy.tenant_id::text=current_setting('app.tenant_id',true)
    AND NOT EXISTS (SELECT 1 FROM invoices canonical WHERE canonical.tenant_id=legacy.tenant_id::text
      AND canonical.metadata->>'student_id'=legacy.student_id::text
      AND (canonical.id::text=legacy.id::text OR canonical.invoice_number=legacy.invoice_number))
`;
