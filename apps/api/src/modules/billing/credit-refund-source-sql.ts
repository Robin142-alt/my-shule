import { ACTIVE_CREDIT_APPLICATION_SQL } from './fee-credit-application-schema';

/** Remaining owned credit. Pending refunds reserve it without changing its owner or the ledger. */
export const CREDIT_REFUND_SOURCES_SQL = `
  SELECT payment.tenant_id,'manual'::text AS source_kind,payment.id AS source_id,payment.id AS receipt_id,
    COALESCE(payment.student_id::text,original.metadata->>'student_id') AS student_id,payment.receipt_number,
    payment.ledger_transaction_id::text AS original_ledger_transaction_id,payment.currency_code,payment.created_at,payment.amount_minor AS receipt_amount_minor,
    (CASE WHEN payment.invoice_id IS NULL AND NOT EXISTS(SELECT 1 FROM manual_fee_payment_allocations a
      WHERE a.tenant_id=payment.tenant_id AND a.manual_payment_id=payment.id) THEN payment.amount_minor
    ELSE COALESCE((SELECT sum(a.amount_minor) FROM manual_fee_payment_allocations a WHERE a.tenant_id=payment.tenant_id
      AND a.manual_payment_id=payment.id AND a.allocation_type='credit'),0) END
    - COALESCE((SELECT sum(a.amount_minor) FROM (${ACTIVE_CREDIT_APPLICATION_SQL}) a
      WHERE a.tenant_id=payment.tenant_id AND a.source_kind='manual' AND a.source_id=payment.id),0)
    - COALESCE((SELECT sum(r.amount_minor) FROM fee_credit_refunds r WHERE r.tenant_id=payment.tenant_id
      AND r.source_kind='manual' AND r.source_id=payment.id AND r.status='completed'),0)) AS remaining_minor
  FROM manual_fee_payments payment LEFT JOIN invoices original ON original.tenant_id=payment.tenant_id AND original.id::text=payment.invoice_id::text
  WHERE payment.tenant_id=current_setting('app.tenant_id',true) AND payment.status='cleared' AND payment.currency_code='KES'
  UNION ALL
  SELECT credit.tenant_id,'online',credit.id,credit.payment_intent_id,credit.student_id::text,'STK-'||credit.payment_intent_id::text,
    credit.ledger_transaction_id::text,p.currency_code,credit.created_at,p.amount_minor,credit.remaining_amount_minor
  FROM student_fee_credits credit JOIN payment_intents p ON p.tenant_id=credit.tenant_id AND p.id=credit.payment_intent_id
    AND p.ledger_transaction_id::text=credit.ledger_transaction_id::text AND p.student_id::text=credit.student_id::text
  WHERE credit.tenant_id=current_setting('app.tenant_id',true) AND p.payment_owner='tenant' AND p.status='completed' AND p.currency_code='KES'
    AND NOT EXISTS(SELECT 1 FROM student_fee_payment_reversals r WHERE r.tenant_id=p.tenant_id AND r.payment_intent_id=p.id)
    AND NOT EXISTS(SELECT 1 FROM manual_fee_payments m WHERE m.tenant_id=p.tenant_id AND m.ledger_transaction_id::text=p.ledger_transaction_id::text)
`;
export const CREDIT_REFUND_AVAILABLE_SQL = `SELECT source.tenant_id,source.source_kind,source.source_id,source.receipt_id,
  source.student_id,source.receipt_number,source.original_ledger_transaction_id,source.currency_code,source.created_at,
  source.receipt_amount_minor::text,source.remaining_minor::text,
  COALESCE(reserved.amount,0)::text AS reserved_minor,(source.remaining_minor-COALESCE(reserved.amount,0))::text AS available_minor
  FROM (${CREDIT_REFUND_SOURCES_SQL}) source LEFT JOIN LATERAL (
    SELECT sum(r.amount_minor) AS amount FROM fee_credit_refunds r WHERE r.tenant_id=source.tenant_id
      AND r.source_kind=source.source_kind AND r.source_id=source.source_id AND r.status IN ('pending','approved')
  ) reserved ON true`;
