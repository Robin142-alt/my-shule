import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service';

export async function lockBankReceiptReferences(db:PrismaService,tenant:string,references:string[]) {
  for(const reference of [...new Set(references.map(value=>value.trim().toUpperCase()).filter(Boolean))].sort())
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',[`bank-receipt:${tenant}:${reference}`]);
}

/** Called in the receipt transaction before any cash or invoice mutation. */
export async function guardBankReceipt(db:PrismaService,tenant:string,references:string[],idempotencyKey:string,collectionId?:string,correctionApprovalId?:string) {
  const refs=[...new Set(references.map(value=>value.trim().toUpperCase()).filter(Boolean))];
  if(!refs.length) return;
  await lockBankReceiptReferences(db,tenant,refs);
  const duplicate=await db.query(`SELECT id FROM manual_fee_payments WHERE tenant_id=$1
    AND payment_method IN ('bank_deposit','eft') AND status IN ('received','deposited','cleared','reversed')
    AND (upper(external_reference)=ANY($2::text[]) OR upper(deposit_reference)=ANY($2::text[]))
    AND idempotency_key IS DISTINCT FROM $3
    ${correctionApprovalId ? `AND NOT (status='reversed'
      AND EXISTS(SELECT 1 FROM finance_approval_requests a WHERE a.tenant_id=$1 AND a.id=$4::uuid
        AND a.status='approved' AND a.action='move_payment' AND manual_fee_payments.id::text IN (
          WITH RECURSIVE ancestors(id) AS (SELECT a.evidence->>'original_receipt_id' UNION
            SELECT c.source_id::text FROM fee_payment_corrections c JOIN ancestors p ON c.replacement_receipt_id::text=p.id
              WHERE c.tenant_id=$1 AND c.source_kind='manual') SELECT id FROM ancestors)))` : ''}
    LIMIT 1`,correctionApprovalId?[tenant,refs,idempotencyKey,correctionApprovalId]:[tenant,refs,idempotencyKey]);
  if(duplicate.rows.length) throw new ConflictException('A bank receipt already uses this reference. Review the existing receipt before recording another payment.');
  // The internal collection path already checks competing statement aliases.
  // Separate native postings may legitimately share a bank reference/serial group.
  if(collectionId) return;
  // Billing can run independently during a staged deployment, before native
  // collections are installed. Existing manual receipt protection still applies.
  const installed=(await db.query<{installed:boolean}>("SELECT to_regclass('collection_payments') IS NOT NULL AS installed")).rows[0]?.installed;
  if(!installed) return;
  const collection=await db.query(`SELECT id FROM collection_payments WHERE tenant_id=$1 AND provider_code<>'safaricom'
    AND (provider_transaction_id=ANY($2::text[]) OR bank_reference=ANY($2::text[]))
    AND ($3::uuid IS NULL OR id<>$3::uuid) LIMIT 1`,[tenant,refs,collectionId ?? null]);
  if(collection.rows.length) throw new ConflictException('This bank reference is already in Collections. Reconcile that payment instead of recording another receipt.');
}
