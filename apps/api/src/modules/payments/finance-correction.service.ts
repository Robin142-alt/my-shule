import { ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { CollectionPaymentsService } from './collection-payments.service';
import { TransactionService } from '../finance/transaction.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { ACTIVE_CREDIT_APPLICATION_SQL } from '../billing/fee-credit-application-schema';

export type FinanceCorrectionApproval = {
  id: string; action: string; subject_type: string; subject_id: string;
  reconciliation_discrepancy_id: string | null; amount_minor: string | number | null;
  currency_code: string; reason: string; requested_by_user_id: string;
};
type CorrectionDiscrepancy = {id:string;provider_transaction_id:string;ledger_transaction_id:string|null;payment_intent_id:string|null};

/** Executes an approved correction through the existing financial workflow.
 * A review decision alone is never proof that a payment has been corrected. */
@Injectable()
export class FinanceCorrectionService {
  constructor(private readonly db: PrismaService, private readonly context: RequestContextService,
    private readonly collections: CollectionPaymentsService,
    @Optional() private readonly transactions?: TransactionService,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService) {}

  async execute(approvalId: string) {
    const actor=this.context.requireStore();
    if(!actor.is_authenticated || !actor.tenant_id || !actor.user_id || actor.role!=='principal')
      throw new ForbiddenException('The Principal must give final approval for a financial correction');
    const tenant=actor.tenant_id;
    return this.db.withRequestTransaction(async()=>{
    const approval=(await this.db.query<FinanceCorrectionApproval>(`SELECT * FROM finance_approval_requests
      WHERE tenant_id=$1 AND id=$2::uuid AND status='approved' AND second_approver_user_id=$3::uuid
        AND first_approver_user_id IS NOT NULL AND first_approver_user_id<>second_approver_user_id
        AND requested_by_user_id<>first_approver_user_id AND requested_by_user_id<>second_approver_user_id
      FOR UPDATE`,[tenant,approvalId,actor.user_id])).rows[0];
    if(!approval) throw new ForbiddenException('An approved request with independent reviewers is required');
    if(approval.subject_type!=='mpesa_reconciliation_discrepancy' || approval.subject_id!==approval.reconciliation_discrepancy_id)
      throw new ConflictException('Link this request to its same-school reconciliation discrepancy before correcting it');
    const discrepancy=(await this.db.query<CorrectionDiscrepancy>(`
      SELECT id,provider_transaction_id,ledger_transaction_id,payment_intent_id FROM mpesa_reconciliation_discrepancies
      WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,[tenant,approval.subject_id])).rows[0];
    if(!discrepancy) throw new NotFoundException('Reconciliation discrepancy was not found in this school');
    if(approval.action!=='reversal') throw new ConflictException(
      'This decision requires an executed financial correction. Use the fee waiver or verified collection matching workflow; approval alone cannot resolve it.');
    await this.db.query('SELECT id FROM mpesa_c2b_payments WHERE tenant_id=$1 AND trans_id=$2 FOR UPDATE',[tenant,discrepancy.provider_transaction_id]);
    const payment=(await this.db.query<{id:string;amount_minor:string;currency_code:string;status:string;ledger_transaction_id:string;manual_fee_payment_id:string}>(`
      SELECT id,amount_minor::text,currency_code,status,ledger_transaction_id,manual_fee_payment_id FROM collection_payments
      WHERE tenant_id=$1 AND provider_code='safaricom' AND provider_transaction_id=$2 FOR UPDATE`,
      [tenant,discrepancy.provider_transaction_id])).rows[0];
    if(!payment) return this.reverseHistoricalStk(approval,discrepancy);
    if(!['posted','reversed'].includes(payment.status) || !payment.manual_fee_payment_id ||
      (discrepancy.ledger_transaction_id && discrepancy.ledger_transaction_id!==payment.ledger_transaction_id) ||
      String(approval.amount_minor ?? '')!==payment.amount_minor || approval.currency_code.trim()!==payment.currency_code.trim())
      throw new ConflictException('The approved amount, currency and posted receipt must match the reconciliation payment');

    if(payment.status==='posted') {
      const pending=(await this.db.query('SELECT id FROM collection_reversal_requests WHERE tenant_id=$1 AND payment_id=$2::uuid AND status=\'pending\'',
        [tenant,payment.id])).rows[0];
      if(pending) throw new ConflictException('This receipt already has a reversal awaiting review in Collections. Complete that review, then retry reconciliation.');
      const request=(await this.db.query<{id:string}>(`INSERT INTO collection_reversal_requests(tenant_id,payment_id,reason,requested_by)
        VALUES($1,$2::uuid,$3,$4::uuid) RETURNING id`,[tenant,payment.id,`Finance approval ${approval.id}: ${approval.reason}`,approval.requested_by_user_id])).rows[0];
      await this.collections.decideReversal(request.id,'approve',`Finance approval ${approval.id}: ${approval.reason}`);
    }
    const result=(await this.db.query<{reversal_ledger_transaction_id:string}>(`
      SELECT receipt.reversal_ledger_transaction_id FROM manual_fee_payments receipt
      JOIN collection_payments payment ON payment.tenant_id=receipt.tenant_id AND payment.manual_fee_payment_id=receipt.id
      JOIN transactions reversal ON reversal.tenant_id=receipt.tenant_id AND reversal.id=receipt.reversal_ledger_transaction_id
      WHERE receipt.tenant_id=$1 AND payment.id=$2::uuid AND payment.status='reversed' AND receipt.status='reversed'
        AND reversal.currency_code=$3 AND reversal.total_amount_minor=$4::bigint`,
      [tenant,payment.id,payment.currency_code,payment.amount_minor])).rows[0];
    if(!result) throw new ConflictException('The financial reversal did not produce a matching ledger entry; the discrepancy remains open');
    return {collection_payment_id:payment.id,manual_fee_payment_id:payment.manual_fee_payment_id,
      reversal_ledger_transaction_id:result.reversal_ledger_transaction_id};
    });
  }

  /** Caller has locked and validated the persisted approval and discrepancy in
   * the enclosing transaction. Do not create a second receipt for older STK. */
  private async reverseHistoricalStk(approval:FinanceCorrectionApproval,discrepancy:CorrectionDiscrepancy) {
    const {tenant_id:tenant,user_id:actor}=this.context.requireStore();
    if(!this.transactions || !this.schoolEvents) throw new ConflictException('Financial correction services are unavailable');
    const payment=(await this.db.query<{id:string;student_id:string;amount_minor:string;currency_code:string;ledger_transaction_id:string}>(`
      SELECT id,student_id::text,amount_minor::text,currency_code,ledger_transaction_id::text FROM payment_intents p
      WHERE tenant_id=$1 AND id=$2::uuid AND payment_owner='tenant' AND status='completed'
        AND student_id IS NOT NULL AND ledger_transaction_id IS NOT NULL
        AND EXISTS(SELECT 1 FROM mpesa_transactions m WHERE m.tenant_id=p.tenant_id AND m.payment_intent_id=p.id
          AND m.ledger_transaction_id::text=p.ledger_transaction_id::text AND m.status='succeeded'
          AND (m.mpesa_receipt_number=$3 OR m.checkout_request_id=$3)) FOR UPDATE`,
      [tenant,discrepancy.payment_intent_id,discrepancy.provider_transaction_id])).rows[0];
    if(!payment) throw new ConflictException('A completed same-school STK payment and its provider receipt are required');
    if(String(approval.amount_minor??'')!==payment.amount_minor || approval.currency_code.trim()!==payment.currency_code.trim()
      || (discrepancy.ledger_transaction_id && discrepancy.ledger_transaction_id!==payment.ledger_transaction_id))
      throw new ConflictException('The approved amount, currency and original ledger must match the payment');
    const existing=(await this.db.query<{reversal_ledger_transaction_id:string}>(`SELECT r.reversal_ledger_transaction_id::text
      FROM student_fee_payment_reversals r JOIN transactions t ON t.tenant_id=r.tenant_id AND t.id=r.reversal_ledger_transaction_id
      WHERE r.tenant_id=$1 AND r.payment_intent_id=$2::uuid AND r.original_ledger_transaction_id::text=$3
        AND r.amount_minor=$4::bigint AND t.total_amount_minor=r.amount_minor AND t.currency_code=r.currency_code`,
      [tenant,payment.id,payment.ledger_transaction_id,payment.amount_minor])).rows[0];
    if(existing) return {payment_intent_id:payment.id,...existing};
    const duplicated=(await this.db.query(`SELECT id FROM manual_fee_payments WHERE tenant_id=$1 AND ledger_transaction_id::text=$2
      UNION ALL SELECT id FROM payment_intents WHERE tenant_id=$1 AND ledger_transaction_id::text=$2 AND id<>$3::uuid`,
      [tenant,payment.ledger_transaction_id,payment.id])).rows;
    if(duplicated.length) throw new ConflictException('This ledger already belongs to another receipt; reconcile its ownership first');

    // Serialize with delayed allocation retries, then lock credit sources before
    // all affected invoices, in the same order used by normal credit application.
    await this.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',
      [`${tenant}:student-fee:${tenant}:${payment.id}:${payment.ledger_transaction_id}`]);
    const credits=(await this.db.query<{id:string;student_id:string;amount_minor:string;remaining_amount_minor:string;ledger_transaction_id:string}>(`
      SELECT id,student_id::text,amount_minor::text,remaining_amount_minor::text,ledger_transaction_id::text
      FROM student_fee_credits WHERE tenant_id=$1 AND payment_intent_id=$2::uuid ORDER BY created_at,id FOR UPDATE`,[tenant,payment.id])).rows;
    if((await this.db.query(`SELECT id FROM fee_credit_refunds WHERE tenant_id=$1 AND source_kind='online'
      AND source_id=ANY($2::uuid[]) AND status IN ('pending','approved','completed') LIMIT 1`,[tenant,credits.map(c=>c.id)])).rows.length)
      throw new ConflictException('This receipt has reserved or refunded credit. Cancel an unpaid refund first; completed refunds require a reconciled correction instead of a full reversal.');
    const allocations=(await this.db.query<{invoice_id:string;student_id:string;amount_minor:string;ledger_transaction_id:string}>(`
      SELECT invoice_id::text,student_id::text,amount_minor::text,ledger_transaction_id::text FROM student_fee_payment_allocations
      WHERE tenant_id=$1 AND payment_intent_id=$2::uuid`,[tenant,payment.id])).rows;
    const applications=(await this.db.query<{id:string;source_id:string;invoice_id:string;student_id:string;amount_minor:string}>(`
      SELECT id,source_id,invoice_id::text,student_id,amount_minor::text FROM (${ACTIVE_CREDIT_APPLICATION_SQL}) a
      WHERE tenant_id=$1 AND source_kind='online' AND source_id=ANY($2::uuid[])`,[tenant,credits.map(c=>c.id)])).rows;
    if([...credits,...allocations].some(row=>row.student_id!==payment.student_id||row.ledger_transaction_id!==payment.ledger_transaction_id)
      || applications.some(row=>row.student_id!==payment.student_id)
      || [...credits,...allocations].reduce((sum,row)=>sum+BigInt(row.amount_minor),0n)!==BigInt(payment.amount_minor)
      || credits.some(credit=>BigInt(credit.remaining_amount_minor)+applications.filter(a=>a.source_id===credit.id)
        .reduce((sum,a)=>sum+BigInt(a.amount_minor),0n)!==BigInt(credit.amount_minor)))
      throw new ConflictException('Payment allocation and credit history must reconcile before reversal');
    const amounts=new Map<string,bigint>();
    for(const row of [...allocations,...applications]) amounts.set(row.invoice_id,(amounts.get(row.invoice_id)??0n)+BigInt(row.amount_minor));
    const invoices=(await this.db.query<{id:string;student_id:string;currency_code:string;amount_paid_minor:string}>(`
      SELECT id::text,metadata->>'student_id' AS student_id,currency_code,amount_paid_minor::text FROM invoices
      WHERE tenant_id=$1 AND id::text=ANY($2::text[]) ORDER BY due_at,issued_at,created_at,id FOR UPDATE`,[tenant,[...amounts.keys()]])).rows;
    if(invoices.length!==amounts.size || invoices.some(row=>row.student_id!==payment.student_id
      || row.currency_code.trim()!==payment.currency_code.trim() || BigInt(row.amount_paid_minor)<amounts.get(row.id)!))
      throw new ConflictException('Invoice balances or ownership need reconciliation before reversing this payment');
    const entries=(await this.db.query<{account_id:string;direction:'debit'|'credit';amount_minor:string;currency_code:string}>(`
      SELECT e.account_id::text,e.direction,e.amount_minor::text,e.currency_code FROM ledger_entries e
      JOIN transactions t ON t.tenant_id=e.tenant_id AND t.id=e.transaction_id
      WHERE e.tenant_id=$1 AND e.transaction_id::text=$2 AND t.total_amount_minor=$3::bigint AND t.currency_code=$4
        AND t.metadata->>'payment_intent_id'=$5 ORDER BY e.line_number`,
      [tenant,payment.ledger_transaction_id,payment.amount_minor,payment.currency_code,payment.id])).rows;
    if(!entries.length || ['debit','credit'].some(direction=>entries.filter(e=>e.direction===direction)
      .reduce((sum,e)=>sum+BigInt(e.amount_minor),0n)!==BigInt(payment.amount_minor)))
      throw new ConflictException('The original payment ledger is incomplete or does not match this receipt');
    const reversed=await this.transactions.postTransaction({idempotency_key:`student-fee:${payment.id}:reverse`,
      reference:`REV-STK-${payment.id}`,description:'Approved student STK receipt correction',
      metadata:{source:'student_fee_payment_reversal',payment_intent_id:payment.id,approval_id:approval.id,
        original_ledger_transaction_id:payment.ledger_transaction_id,reason:approval.reason},
      entries:entries.map(entry=>({...entry,direction:entry.direction==='debit'?'credit':'debit'}))});
    for(const invoice of invoices) await this.db.query(`UPDATE invoices SET amount_paid_minor=amount_paid_minor-$3::bigint,
      status=CASE WHEN status IN ('void','uncollectible') THEN status WHEN amount_paid_minor-$3::bigint>=total_amount_minor THEN 'paid'
        WHEN amount_paid_minor-$3::bigint>0 THEN 'pending_payment' ELSE 'open' END,
      paid_at=CASE WHEN amount_paid_minor-$3::bigint>=total_amount_minor THEN paid_at ELSE NULL END,updated_at=now()
      WHERE tenant_id=$1 AND id::text=$2`,[tenant,invoice.id,amounts.get(invoice.id)!.toString()]);
    for(const application of applications) await this.db.query(`INSERT INTO fee_credit_application_reversals(tenant_id,application_id,reason,created_by)
      VALUES($1,$2::uuid,$3,$4)`,[tenant,application.id,approval.reason,actor]);
    await this.db.query(`UPDATE student_fee_credits SET remaining_amount_minor=0,updated_at=now()
      WHERE tenant_id=$1 AND payment_intent_id=$2::uuid`,[tenant,payment.id]);
    await this.db.query(`INSERT INTO student_fee_payment_reversals(tenant_id,payment_intent_id,student_id,approval_id,
      original_ledger_transaction_id,reversal_ledger_transaction_id,amount_minor,currency_code,reason,created_by)
      VALUES($1,$2::uuid,$3,$4::uuid,$5,$6,$7::bigint,$8,$9,$10)`,[tenant,payment.id,payment.student_id,approval.id,
      payment.ledger_transaction_id,reversed.transaction_id,payment.amount_minor,payment.currency_code,approval.reason,actor]);
    const recipients=(await this.db.query<{user_id:string}>(`SELECT user_id FROM student_guardians
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' AND user_id IS NOT NULL
      UNION SELECT user_id FROM student_portal_access
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' AND user_id IS NOT NULL`,[tenant,payment.student_id])).rows;
    await this.schoolEvents.recordSchoolOperation({schoolId:tenant,event:{id:`student-fee:${payment.id}:reversed`,type:'payment.reversed',
      module:'finance',entityId:payment.id,title:'M-Pesa receipt corrected',body:'An approved correction restored the learner invoice balances.',
      payload:{student_id:payment.student_id,approval_id:approval.id,amount_minor:payment.amount_minor,
        original_ledger_transaction_id:payment.ledger_transaction_id,reversal_ledger_transaction_id:reversed.transaction_id,
        reversed_credit_applications:applications.map(a=>a.id),reason:approval.reason}},
      notifications:recipients.map(recipient=>({id:`student-fee:${payment.id}:reversed:${recipient.user_id}`,
        audienceRoles:['parent','student'],targetUserId:recipient.user_id,title:'Fee receipt corrected',
        body:'An approved receipt correction updated your fee statement. Open Fees to view the corrected balance.',href:'/fees'}))});
    return {payment_intent_id:payment.id,reversal_ledger_transaction_id:reversed.transaction_id};
  }
}
