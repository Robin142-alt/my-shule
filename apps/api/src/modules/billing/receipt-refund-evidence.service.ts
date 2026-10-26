import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { AuditLogService } from '../observability/audit-log.service';

export type RefundEvidenceInput={receipt_id:string;source_kind:'manual'|'stk';amount_minor:string;
  external_reference:string;evidence_reference:string;paid_at:string;reason:string};
type ReversedReceipt={receipt_id:string;source_kind:string;student_id:string;amount_minor:string;currency_code:string;
  original_ledger_transaction_id:string;reversal_ledger_transaction_id:string};
type RefundEvidence=RefundEvidenceInput & ReversedReceipt & {id:string;status:string;requested_by:string;
  reviewed_by:string|null;decision_reason:string|null;created_at:Date};

@Injectable()
export class ReceiptRefundEvidenceService {
  constructor(private readonly db:PrismaService,private readonly context:RequestContextService,
    private readonly events:SchoolOperationalEventsService,private readonly audit:AuditLogService) {}

  async list(offset=0) {
    const actor=this.authorize(false);
    if(!Number.isSafeInteger(offset)||offset<0) throw new BadRequestException('Invalid refund page');
    const rows=(await this.db.query<RefundEvidence>(`SELECT r.*,r.amount_minor::text,
      concat_ws(' ',student.first_name,student.last_name) AS student_name,
      COALESCE(receipt.receipt_number,'STK-'||r.receipt_id::text) AS receipt_number
      FROM receipt_refund_evidence r LEFT JOIN students student ON student.tenant_id=r.tenant_id AND student.id::text=r.student_id
      LEFT JOIN manual_fee_payments receipt ON receipt.tenant_id=r.tenant_id AND receipt.id=r.receipt_id AND r.source_kind='manual'
      WHERE r.tenant_id=$1 ORDER BY r.created_at DESC,r.id LIMIT 50 OFFSET $2`,[actor.tenant_id,offset])).rows;
    return {items:rows.map(row=>({...row,can_review:actor.role==='principal' && row.status==='pending_review' && row.requested_by!==actor.user_id}))};
  }

  async request(input:RefundEvidenceInput) {
    const actor=this.authorize();
    if(!['manual','stk'].includes(input.source_kind)||!/^\d{1,19}$/.test(input.amount_minor??'')||BigInt(input.amount_minor)<=0n)
      throw new BadRequestException('A reversed receipt and its exact full amount are required');
    const reason=this.text(input.reason,5,1000),reference=this.text(input.external_reference,3,100).toUpperCase();
    const evidence=this.text(input.evidence_reference,10,1000),paidAt=new Date(input.paid_at);
    if(!Number.isFinite(paidAt.getTime())||paidAt.getTime()>Date.now()) throw new BadRequestException('Enter the actual refund date, which cannot be in the future');
    return this.db.withRequestTransaction(async()=>{
      const receipt=await this.requireReversed(input.receipt_id,input.source_kind);
      if(input.amount_minor!==receipt.amount_minor) throw new ConflictException('Refund amount must equal the full reversed receipt; partial refunds need a separate credit refund workflow');
      await this.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',[`refund:${actor.tenant_id}:${receipt.reversal_ledger_transaction_id}`]);
      // Separate receipt/reference locks prevent two receipts claiming one payout.
      await this.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',[`refund-reference:${actor.tenant_id}:${reference}`]);
      const existing=(await this.db.query<RefundEvidence>(`SELECT *,amount_minor::text FROM receipt_refund_evidence WHERE tenant_id=$1
        AND (reversal_ledger_transaction_id=$2 OR external_reference=$3) AND status IN ('pending_review','approved')`,
        [actor.tenant_id,receipt.reversal_ledger_transaction_id,reference])).rows[0];
      if(existing) {
        if(existing.receipt_id===input.receipt_id && existing.source_kind===input.source_kind && existing.requested_by===actor.user_id
          && existing.amount_minor===input.amount_minor && existing.external_reference===reference && existing.reason===reason
          && existing.evidence_reference===evidence && new Date(existing.paid_at).toISOString()===paidAt.toISOString()) return existing;
        throw new ConflictException('This receipt or outgoing reference already has different refund evidence; review the existing details');
      }
      const saved=(await this.db.query<RefundEvidence>(`INSERT INTO receipt_refund_evidence(tenant_id,receipt_id,source_kind,student_id,
        original_ledger_transaction_id,reversal_ledger_transaction_id,amount_minor,currency_code,external_reference,evidence_reference,paid_at,reason,requested_by)
        VALUES($1,$2::uuid,$3,$4,$5,$6,$7::bigint,$8,$9,$10,$11::timestamptz,$12,$13) RETURNING *,amount_minor::text`,
        [actor.tenant_id,input.receipt_id,input.source_kind,receipt.student_id,receipt.original_ledger_transaction_id,
          receipt.reversal_ledger_transaction_id,receipt.amount_minor,receipt.currency_code,reference,evidence,paidAt.toISOString(),reason,actor.user_id])).rows[0];
      await this.record(saved,'requested');return saved;
    });
  }

  async decide(id:string,decision:'approve'|'reject',reason:string) {
    const actor=this.authorize();
    if(actor.role!=='principal') throw new ForbiddenException('Only the Principal can review refund evidence');
    if(!['approve','reject'].includes(decision)) throw new BadRequestException('Choose approve or reject');
    const note=this.text(reason,5,1000),status=decision==='approve'?'approved':'rejected';
    return this.db.withRequestTransaction(async()=>{
      const record=(await this.db.query<RefundEvidence>('SELECT *,amount_minor::text FROM receipt_refund_evidence WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE',[actor.tenant_id,id])).rows[0];
      if(!record) throw new NotFoundException('Refund evidence was not found in this school');
      if(record.requested_by===actor.user_id) throw new ForbiddenException('A different Principal must review this evidence');
      if(record.status!=='pending_review') {
        if(record.status===status && record.reviewed_by===actor.user_id && record.decision_reason===note) return record;
        throw new ConflictException('Refund evidence has already been reviewed');
      }
      if(decision==='approve') {
        const receipt=await this.requireReversed(record.receipt_id,record.source_kind as 'manual'|'stk');
        if(receipt.reversal_ledger_transaction_id!==record.reversal_ledger_transaction_id || receipt.amount_minor!==record.amount_minor)
          throw new ConflictException('The receipt and refund proof no longer agree');
      }
      const saved=(await this.db.query<RefundEvidence>(`UPDATE receipt_refund_evidence SET status=$3,reviewed_by=$4,reviewed_at=now(),
        decision_reason=$5,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid RETURNING *,amount_minor::text`,[actor.tenant_id,id,status,actor.user_id,note])).rows[0];
      await this.record(saved,status);return saved;
    });
  }

  private async requireReversed(id:string,kind:'manual'|'stk') {
    if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id??'')) throw new BadRequestException('Choose a valid receipt');
    const tenant=this.context.requireStore().tenant_id;
    const rows=await this.db.query<ReversedReceipt>(`WITH receipt AS (
      SELECT m.id::text AS receipt_id,'manual'::text AS source_kind,
        COALESCE(m.student_id::text,i.metadata->>'student_id') AS student_id,m.amount_minor,m.currency_code,
        m.ledger_transaction_id::text AS original_ledger_transaction_id,m.reversal_ledger_transaction_id::text AS reversal_ledger_transaction_id
      FROM manual_fee_payments m LEFT JOIN invoices i ON i.tenant_id=m.tenant_id AND i.id::text=m.invoice_id::text
      WHERE m.tenant_id=$1 AND m.id=$2::uuid AND m.status='reversed' AND $3='manual'
      UNION ALL SELECT payment_intent_id::text,'stk',student_id,amount_minor,currency_code,original_ledger_transaction_id::text,reversal_ledger_transaction_id::text
      FROM student_fee_payment_reversals WHERE tenant_id=$1 AND payment_intent_id=$2::uuid AND $3='stk'
    ) SELECT receipt.*,receipt.amount_minor::text FROM receipt
      JOIN transactions original ON original.tenant_id=$1 AND original.id::text=receipt.original_ledger_transaction_id
      JOIN transactions reversal ON reversal.tenant_id=$1 AND reversal.id::text=receipt.reversal_ledger_transaction_id
      WHERE receipt.student_id IS NOT NULL AND original.total_amount_minor=receipt.amount_minor AND original.currency_code=receipt.currency_code
        AND reversal.total_amount_minor=receipt.amount_minor AND reversal.currency_code=receipt.currency_code`,[tenant,id,kind]);
    if(!rows.rows[0]) throw new ConflictException('An executed same-school full receipt reversal with matching ledger proof is required');
    return rows.rows[0];
  }

  private authorize(write=true) {
    const actor=this.context.requireStore();
    if(!actor.is_authenticated||!actor.tenant_id||!actor.user_id||!['accountant','bursar','principal'].includes(actor.role??'')
      || !actor.permissions?.some(p=>['*:*','billing:*',write?'billing:write':'billing:read'].includes(p)))
      throw new ForbiddenException('School finance permission is required');
    return actor;
  }
  private text(value:string,min:number,max:number) {
    if(typeof value!=='string'||value.trim().length<min||value.length>max) throw new BadRequestException(`Provide between ${min} and ${max} characters of refund evidence or notes`);
    return value.trim();
  }
  private async record(row:RefundEvidence,action:string) {
    const tenant=this.context.requireStore().tenant_id;
    const id=`receipt-refund:${row.id}:${action}`;
    await this.audit.record({action:`finance.refund_evidence.${action}`,resource_type:'receipt_refund_evidence',resource_id:row.id,
      metadata:{receipt_id:row.receipt_id,amount_minor:row.amount_minor,reversal_ledger_transaction_id:row.reversal_ledger_transaction_id}});
    await this.events.recordSchoolOperation({schoolId:tenant,event:{id,type:`payment.refund_evidence.${action}`,module:'finance',entityId:row.id,
      title:'Refund evidence review',body:`Full receipt refund evidence ${action}. No additional ledger posting or transfer was made.`,
      payload:{receipt_id:row.receipt_id,student_id:row.student_id,status:row.status}},notifications:[{id,title:'Refund evidence review',
        body:`Refund evidence ${action}. Open Collections to review the recorded payout proof.`,audienceRoles:['principal','accountant','bursar'],href:'/collections'}]});
  }
}
