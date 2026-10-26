import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { CollectionPaymentsService } from './collection-payments.service';

export type FinanceCorrectionApproval = {
  id: string; action: string; subject_type: string; subject_id: string;
  reconciliation_discrepancy_id: string | null; amount_minor: string | number | null;
  currency_code: string; reason: string; requested_by_user_id: string;
};

/** Executes an approved correction through the existing financial workflow.
 * A review decision alone is never proof that a payment has been corrected. */
@Injectable()
export class FinanceCorrectionService {
  constructor(private readonly db: PrismaService, private readonly context: RequestContextService,
    private readonly collections: CollectionPaymentsService) {}

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
    const discrepancy=(await this.db.query<{id:string;provider_transaction_id:string;ledger_transaction_id:string|null}>(`
      SELECT id,provider_transaction_id,ledger_transaction_id FROM mpesa_reconciliation_discrepancies
      WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,[tenant,approval.subject_id])).rows[0];
    if(!discrepancy) throw new NotFoundException('Reconciliation discrepancy was not found in this school');
    if(approval.action!=='reversal') throw new ConflictException(
      'This decision requires an executed financial correction. Use the fee waiver or verified collection matching workflow; approval alone cannot resolve it.');
    await this.db.query('SELECT id FROM mpesa_c2b_payments WHERE tenant_id=$1 AND trans_id=$2 FOR UPDATE',[tenant,discrepancy.provider_transaction_id]);
    const payment=(await this.db.query<{id:string;amount_minor:string;currency_code:string;status:string;ledger_transaction_id:string;manual_fee_payment_id:string}>(`
      SELECT id,amount_minor::text,currency_code,status,ledger_transaction_id,manual_fee_payment_id FROM collection_payments
      WHERE tenant_id=$1 AND provider_code='safaricom' AND provider_transaction_id=$2 FOR UPDATE`,
      [tenant,discrepancy.provider_transaction_id])).rows[0];
    if(!payment) throw new ConflictException('This historical payment needs a linked receipt correction before reconciliation can be resolved');
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
}
