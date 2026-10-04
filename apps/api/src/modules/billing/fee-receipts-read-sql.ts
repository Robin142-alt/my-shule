/** Read-only receipt projection. STK receipts already posted to the ledger must
 * never be inserted as another manual payment or credited a second time. */
export const FEE_RECEIPTS_READ_SQL = `
  SELECT id::text, tenant_id, idempotency_key, receipt_number, payment_method, status,
    student_id::text, invoice_id::text, amount_minor, currency_code, payer_name, received_at,
    deposited_at, cleared_at, bounced_at, reversed_at, cheque_number, drawer_bank,
    deposit_reference, external_reference, asset_account_code, fee_control_account_code,
    ledger_transaction_id::text, reversal_ledger_transaction_id::text, notes, metadata,
    created_by_user_id::text, created_at, updated_at
  FROM manual_fee_payments WHERE tenant_id=$1
  UNION ALL
  SELECT p.id::text, p.tenant_id, 'stk:' || p.id::text,
    'STK-' || p.id::text, 'mpesa_c2b', 'cleared',
    p.student_id::text, NULL::text, p.amount_minor, p.currency_code, NULL::text,
    COALESCE(p.completed_at,p.created_at), NULL::timestamptz, p.completed_at,
    NULL::timestamptz, NULL::timestamptz, NULL::text, NULL::text, NULL::text,
    (SELECT mt.mpesa_receipt_number FROM mpesa_transactions mt
      WHERE mt.tenant_id=p.tenant_id AND mt.payment_intent_id=p.id
        AND mt.ledger_transaction_id::text=p.ledger_transaction_id::text AND mt.mpesa_receipt_number IS NOT NULL
      ORDER BY mt.created_at LIMIT 1),
    '1110-MPESA-CLEARING', '1100-AR-FEES', p.ledger_transaction_id::text,
    NULL::text, NULL::text,
    jsonb_build_object('source','stk_payment',
      'invoice_allocations', COALESCE((SELECT jsonb_agg(jsonb_build_object('invoice_id',a.invoice_id,'amount_minor',a.amount_minor::text))
        FROM student_fee_payment_allocations a WHERE a.tenant_id=p.tenant_id AND a.payment_intent_id=p.id),'[]'::jsonb),
      'credit_amount_minor', COALESCE((SELECT SUM(c.remaining_amount_minor) FROM student_fee_credits c
        WHERE c.tenant_id=p.tenant_id AND c.payment_intent_id=p.id),0)::text),
    p.user_id::text, p.created_at, p.updated_at
  FROM payment_intents p
  WHERE p.tenant_id=$1 AND p.payment_owner='tenant' AND p.status='completed'
    AND p.student_id IS NOT NULL AND p.ledger_transaction_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM manual_fee_payments m WHERE m.tenant_id=p.tenant_id AND m.ledger_transaction_id::text=p.ledger_transaction_id::text)
`;
