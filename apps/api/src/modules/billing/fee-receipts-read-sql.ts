import { ACTIVE_CREDIT_APPLICATION_SQL } from './fee-credit-application-schema';

function refundsFor(receipt:string) {
  return `COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'amount_minor',r.amount_minor::text,'paid_at',r.paid_at,
    'reference',r.external_reference,'ledger_transaction_id',r.ledger_transaction_id) ORDER BY r.paid_at,r.id)
    FROM fee_credit_refunds r WHERE r.tenant_id=${receipt}.tenant_id AND r.receipt_id::text=${receipt}.id::text
      AND r.source_kind='${receipt==='p'?'online':'manual'}' AND r.status='completed'),'[]'::jsonb)`;
}

/** Read-only receipt projection. STK receipts already posted to the ledger must
 * never be inserted as another manual payment or credited a second time. */
export const FEE_RECEIPTS_READ_SQL = `
  SELECT id::text, tenant_id, idempotency_key, receipt_number, payment_method, status,
    COALESCE(student_id::text,(SELECT original.metadata->>'student_id' FROM invoices original
      WHERE original.tenant_id=manual_fee_payments.tenant_id AND original.id::text=manual_fee_payments.invoice_id::text)) AS student_id,
    invoice_id::text, amount_minor, currency_code, payer_name, received_at,
    deposited_at, cleared_at, bounced_at, reversed_at, cheque_number, drawer_bank,
    deposit_reference, external_reference, asset_account_code, fee_control_account_code,
    ledger_transaction_id::text, reversal_ledger_transaction_id::text, notes,
    metadata || jsonb_build_object('credit_refunds',${refundsFor('manual_fee_payments')}) AS metadata,
    created_by_user_id::text, created_at, updated_at
  FROM manual_fee_payments WHERE tenant_id=$1
  UNION ALL
  SELECT p.id::text, p.tenant_id, 'stk:' || p.id::text,
    'STK-' || p.id::text, 'mpesa_c2b', CASE WHEN reversal.id IS NULL THEN 'cleared' ELSE 'reversed' END,
    p.student_id::text, NULL::text, p.amount_minor, p.currency_code, NULL::text,
    COALESCE(p.completed_at,p.created_at), NULL::timestamptz, p.completed_at,
    NULL::timestamptz, reversal.created_at, NULL::text, NULL::text, NULL::text,
    (SELECT mt.mpesa_receipt_number FROM mpesa_transactions mt
      WHERE mt.tenant_id=p.tenant_id AND mt.payment_intent_id=p.id
        AND mt.ledger_transaction_id::text=p.ledger_transaction_id::text AND mt.mpesa_receipt_number IS NOT NULL
      ORDER BY mt.created_at LIMIT 1),
    '1110-MPESA-CLEARING', '1100-AR-FEES', p.ledger_transaction_id::text,
    reversal.reversal_ledger_transaction_id::text, NULL::text,
    jsonb_build_object('source','stk_payment','credit_refunds',${refundsFor('p')},
      'invoice_allocations', COALESCE((SELECT jsonb_agg(jsonb_build_object('invoice_id',a.invoice_id,'amount_minor',a.amount_minor::text)) FROM (
        SELECT invoice_id,amount_minor FROM student_fee_payment_allocations WHERE tenant_id=p.tenant_id AND payment_intent_id=p.id
        UNION ALL SELECT applied.invoice_id,applied.amount_minor FROM (${ACTIVE_CREDIT_APPLICATION_SQL}) applied
          JOIN student_fee_credits credit ON credit.tenant_id=applied.tenant_id AND credit.id=applied.source_id
          WHERE applied.tenant_id=p.tenant_id AND applied.source_kind='online' AND credit.payment_intent_id=p.id
        ) a),'[]'::jsonb),
      'credit_amount_minor', COALESCE((SELECT SUM(c.remaining_amount_minor) FROM student_fee_credits c
        WHERE c.tenant_id=p.tenant_id AND c.payment_intent_id=p.id),0)::text),
    p.user_id::text, p.created_at, COALESCE(reversal.created_at,p.updated_at)
  FROM payment_intents p
  LEFT JOIN student_fee_payment_reversals reversal ON reversal.tenant_id=p.tenant_id AND reversal.payment_intent_id=p.id
  WHERE p.tenant_id=$1 AND p.payment_owner='tenant' AND p.status='completed'
    AND p.student_id IS NOT NULL AND p.ledger_transaction_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM manual_fee_payments m WHERE m.tenant_id=p.tenant_id AND m.ledger_transaction_id::text=p.ledger_transaction_id::text)
`;
