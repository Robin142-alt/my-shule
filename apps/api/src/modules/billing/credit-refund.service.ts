import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { TransactionService } from '../finance/transaction.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { AuditLogService } from '../observability/audit-log.service';
import { CREDIT_REFUND_AVAILABLE_SQL } from './credit-refund-source-sql';

type Kind='manual'|'online';
export type CreditRefundInput={source_kind:Kind;source_id:string;amount_minor:string;reason:string;idempotency_key:string};
export type CreditRefundProof={external_reference:string;evidence_reference:string;paid_at:string};
type Source={source_kind:Kind;source_id:string;receipt_id:string;student_id:string;original_ledger_transaction_id:string;
  receipt_number:string;currency_code:string;receipt_amount_minor:string;remaining_minor:string;reserved_minor:string;available_minor:string};
type Refund=CreditRefundInput & Source & Partial<CreditRefundProof> & {id:string;status:string;requested_by:string;reviewed_by:string;
  reviewed_at:Date;decision_reason:string;cancelled_by:string;cancellation_reason:string;completed_by:string;ledger_transaction_id:string};

@Injectable()
export class CreditRefundService {
  constructor(private readonly db:PrismaService,private readonly context:RequestContextService,
    private readonly transactions:TransactionService,private readonly events:SchoolOperationalEventsService,private readonly audit:AuditLogService) {}

  async sources(studentId:string) {
    const actor=this.authorize(false);if(!studentId?.trim()) throw new BadRequestException('Choose a student');
    const items=(await this.db.query<Source>(`SELECT source.* FROM (${CREDIT_REFUND_AVAILABLE_SQL}) source
      JOIN students s ON s.tenant_id=source.tenant_id AND s.id::text=source.student_id
      WHERE source.tenant_id=$1 AND source.student_id=$2 AND source.remaining_minor::bigint>0
      ORDER BY source.created_at,source.source_id LIMIT 100`,[actor.tenant_id,studentId])).rows;
    return {items};
  }
  async list(offset=0) {
    const actor=this.authorize(false);if(!Number.isSafeInteger(offset)||offset<0) throw new BadRequestException('Invalid refund page');
    const items=(await this.db.query<Refund>(`SELECT r.*,r.amount_minor::text,
      concat_ws(' ',to_jsonb(s)->>'first_name',to_jsonb(s)->>'last_name') AS student_name,
      COALESCE(m.receipt_number,'STK-'||r.receipt_id::text) AS receipt_number
      FROM fee_credit_refunds r JOIN students s ON s.tenant_id=r.tenant_id AND s.id::text=r.student_id
      LEFT JOIN manual_fee_payments m ON m.tenant_id=r.tenant_id AND m.id=r.receipt_id AND r.source_kind='manual'
      WHERE r.tenant_id=$1 ORDER BY r.created_at DESC,r.id LIMIT 50 OFFSET $2`,[actor.tenant_id,offset])).rows;
    return {items:items.map(r=>({...r,can_review:r.status==='pending'&&actor.role==='principal'&&r.requested_by!==actor.user_id,
      can_cancel:['pending','approved'].includes(r.status)&&(actor.role==='principal'||r.requested_by===actor.user_id),can_complete:r.status==='approved'}))};
  }
  async request(input:CreditRefundInput) {
    const actor=this.authorize();this.uuid(input.source_id);this.uuid(input.idempotency_key);
    input={...input,source_id:input.source_id.toLowerCase(),idempotency_key:input.idempotency_key.toLowerCase()};
    if(!['manual','online'].includes(input.source_kind)||!/^([1-9]\d{0,18})$/.test(input.amount_minor??'')||BigInt(input.amount_minor)>9223372036854775807n)
      throw new BadRequestException('Enter a positive, exact refund amount');
    const reason=this.text(input.reason,5,1000);
    return this.db.withRequestTransaction(async()=>{
      await this.lock(`credit-refund-request:${actor.tenant_id}:${input.idempotency_key}`);
      const previous=(await this.db.query<Refund>('SELECT *,amount_minor::text FROM fee_credit_refunds WHERE tenant_id=$1 AND idempotency_key=$2::uuid',[actor.tenant_id,input.idempotency_key])).rows[0];
      if(previous) {
        if(previous.source_id===input.source_id&&previous.source_kind===input.source_kind&&previous.amount_minor===input.amount_minor
          &&previous.reason===reason&&previous.requested_by===actor.user_id) return previous;
        throw new ConflictException('This refund request already has different details');
      }
      const source=await this.lockSource(input.source_kind,input.source_id);
      if(BigInt(source.available_minor)<BigInt(input.amount_minor)) throw new ConflictException('The requested amount exceeds available, unreserved credit');
      await this.ledgerEntries(source);
      const saved=(await this.db.query<Refund>(`INSERT INTO fee_credit_refunds(tenant_id,idempotency_key,source_kind,source_id,receipt_id,
        student_id,original_ledger_transaction_id,amount_minor,currency_code,reason,requested_by)
        VALUES($1,$2::uuid,$3,$4::uuid,$5::uuid,$6,$7,$8::bigint,$9,$10,$11) RETURNING *,amount_minor::text`,
        [actor.tenant_id,input.idempotency_key,input.source_kind,input.source_id,source.receipt_id,source.student_id,
          source.original_ledger_transaction_id,input.amount_minor,source.currency_code,reason,actor.user_id])).rows[0];
      await this.record(saved,'requested');return saved;
    });
  }
  async decide(id:string,decision:'approve'|'reject'|'cancel',reason:string) {
    const actor=this.authorize();this.uuid(id);const note=this.text(reason,5,1000);
    if(!['approve','reject','cancel'].includes(decision)) throw new BadRequestException('Choose approve, reject or cancel');
    if(decision!=='cancel'&&actor.role!=='principal') throw new ForbiddenException('A different Principal must review refunds');
    return this.db.withRequestTransaction(async()=>{
      const row=await this.getLocked(id),status=decision==='approve'?'approved':decision==='reject'?'rejected':'cancelled';
      if(decision==='cancel'?(actor.role!=='principal'&&row.requested_by!==actor.user_id):row.requested_by===actor.user_id)
        throw new ForbiddenException('Independent Principal review or the original requester is required');
      if(row.status===status&&(decision==='cancel'?row.cancelled_by===actor.user_id&&row.cancellation_reason===note:row.reviewed_by===actor.user_id&&row.decision_reason===note)) return row;
      if(!(row.status==='pending'||(row.status==='approved'&&decision==='cancel'))) throw new ConflictException('This refund has already progressed; refresh its status');
      if(decision==='approve') {
        const source=await this.lockSource(row.source_kind,row.source_id);
        if(BigInt(source.remaining_minor)<BigInt(source.reserved_minor)) throw new ConflictException('Available credit no longer covers the reservation; reconcile or reject the refund');
      }else await this.lock(`fee-credit:${actor.tenant_id}:${row.student_id}`);
      const fields=decision==='cancel'?'cancelled_by=$4,cancelled_at=now(),cancellation_reason=$5':'reviewed_by=$4,reviewed_at=now(),decision_reason=$5';
      const saved=(await this.db.query<Refund>(`UPDATE fee_credit_refunds SET status=$3,${fields},updated_at=now()
        WHERE tenant_id=$1 AND id=$2::uuid RETURNING *,amount_minor::text`,[actor.tenant_id,id,status,actor.user_id,note])).rows[0];
      await this.record(saved,status);return saved;
    });
  }
  async complete(id:string,input:CreditRefundProof) {
    const actor=this.authorize();this.uuid(id);
    const reference=this.text(input.external_reference,3,100).toUpperCase(),evidence=this.text(input.evidence_reference,10,1000),paid=new Date(input.paid_at);
    if(!Number.isFinite(paid.getTime())||paid.getTime()>Date.now()) throw new BadRequestException('Enter the actual payout date, which cannot be in the future');
    return this.db.withRequestTransaction(async()=>{
      const row=await this.getLocked(id);
      if(row.status==='completed') {
        if(row.external_reference===reference&&row.evidence_reference===evidence&&new Date(row.paid_at!).toISOString()===paid.toISOString()&&row.completed_by===actor.user_id) return row;
        throw new ConflictException('This refund is already recorded with different payout evidence');
      }
      if(row.status!=='approved') throw new ConflictException('Independent Principal approval is required before recording a payout');
      if(paid.getTime()<new Date(row.reviewed_at).getTime()) throw new BadRequestException('This payout predates its approval; reconcile the earlier payment instead');
      const source=await this.lockSource(row.source_kind,row.source_id);
      if(source.student_id!==row.student_id||source.original_ledger_transaction_id!==row.original_ledger_transaction_id
        ||BigInt(source.remaining_minor)<BigInt(source.reserved_minor)||BigInt(source.reserved_minor)<BigInt(row.amount_minor))
        throw new ConflictException('Reserved credit and receipt history no longer agree; reconcile before posting');
      await this.lock(`refund-reference:${actor.tenant_id}:${reference}`);
      const duplicate=await this.db.query(`SELECT id FROM fee_credit_refunds WHERE tenant_id=$1 AND external_reference=$2
        UNION ALL SELECT id FROM receipt_refund_evidence WHERE tenant_id=$1 AND external_reference=$2 AND status IN ('pending_review','approved')`,[actor.tenant_id,reference]);
      if(duplicate.rows.length) throw new ConflictException('This outgoing reference already belongs to another refund');
      const entries=await this.ledgerEntries(source);
      const posted=await this.transactions.postTransaction({idempotency_key:`credit-refund:${id}`,reference:`CREDIT-REFUND-${id}`,
        description:'Approved refund of unused student fee credit',effective_at:paid.toISOString(),
        metadata:{source:'fee_credit_refund',refund_id:id,student_id:row.student_id,receipt_id:row.receipt_id,
          original_ledger_transaction_id:row.original_ledger_transaction_id,external_reference:reference},
        entries:entries.map(entry=>({...entry,amount_minor:row.amount_minor,direction:entry.direction==='debit'?'credit':'debit'}))});
      if(row.source_kind==='online') await this.db.query(`UPDATE student_fee_credits SET remaining_amount_minor=remaining_amount_minor-$3::bigint,
        updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid`,[actor.tenant_id,row.source_id,row.amount_minor]);
      const saved=(await this.db.query<Refund>(`UPDATE fee_credit_refunds SET status='completed',external_reference=$3,evidence_reference=$4,
        paid_at=$5::timestamptz,completed_by=$6,completed_at=now(),ledger_transaction_id=$7,updated_at=now()
        WHERE tenant_id=$1 AND id=$2::uuid RETURNING *,amount_minor::text`,[actor.tenant_id,id,reference,evidence,paid.toISOString(),actor.user_id,posted.transaction_id])).rows[0];
      await this.record(saved,'completed');return saved;
    });
  }
  private async getLocked(id:string) {
    const row=(await this.db.query<Refund>('SELECT *,amount_minor::text FROM fee_credit_refunds WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE',[this.context.requireStore().tenant_id,id])).rows[0];
    if(!row) throw new NotFoundException('Refund was not found in this school');return row;
  }
  private async lockSource(kind:Kind,id:string) {
    const tenant=this.context.requireStore().tenant_id;
    const find=async()=> (await this.db.query<Source>(`SELECT * FROM (${CREDIT_REFUND_AVAILABLE_SQL}) source
      WHERE tenant_id=$1 AND source_kind=$2 AND source_id=$3::uuid
        AND EXISTS(SELECT 1 FROM students s WHERE s.tenant_id=source.tenant_id AND s.id::text=source.student_id)`,[tenant,kind,id])).rows[0];
    let source=await find();if(!source?.student_id||!source.original_ledger_transaction_id) throw new ConflictException('A cleared same-school receipt with unused student credit is required');
    await this.lock(`fee-credit:${tenant}:${source.student_id}`);
    await this.db.query(`SELECT id FROM ${kind==='manual'?'manual_fee_payments':'student_fee_credits'} WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,[tenant,id]);
    source=await find();if(!source) throw new ConflictException('The source receipt changed; refresh available credit');
    const history=kind==='manual'?await this.db.query<{valid:boolean}>(`SELECT
      COALESCE(sum(amount_minor),$3::bigint)=$3::bigint AND COALESCE(bool_and(student_id IS NULL OR student_id::text=$4),true) AS valid
      FROM manual_fee_payment_allocations WHERE tenant_id=$1 AND manual_payment_id=$2::uuid`,[tenant,id,source.receipt_amount_minor,source.student_id]):
      await this.db.query<{valid:boolean}>(`SELECT sum(amount_minor)=$3::bigint AND bool_and(COALESCE(student_id=$4 AND ledger_id=$5,false)) AS valid FROM (
        SELECT amount_minor,student_id::text,ledger_transaction_id::text AS ledger_id FROM student_fee_credits WHERE tenant_id=$1 AND payment_intent_id=$2::uuid
        UNION ALL SELECT amount_minor,student_id::text,ledger_transaction_id::text FROM student_fee_payment_allocations WHERE tenant_id=$1 AND payment_intent_id=$2::uuid
      ) history`,[tenant,source.receipt_id,source.receipt_amount_minor,source.student_id,source.original_ledger_transaction_id]);
    if(!history.rows[0]?.valid||BigInt(source.remaining_minor)<0n||BigInt(source.remaining_minor)>BigInt(source.receipt_amount_minor))
      throw new ConflictException('Receipt allocation history must reconcile before reserving or paying a refund');
    return source;
  }
  private async ledgerEntries(source:Source) {
    const rows=(await this.db.query<{account_id:string;direction:'debit'|'credit';amount_minor:string;currency_code:string}>(`
      SELECT e.account_id::text,lower(e.direction::text) AS direction,e.amount_minor::text,e.currency_code FROM ledger_entries e
      JOIN transactions t ON t.tenant_id=e.tenant_id AND t.id=e.transaction_id
      WHERE e.tenant_id=$1 AND e.transaction_id::text=$2 AND t.total_amount_minor=$3::bigint AND t.currency_code=$4 ORDER BY e.line_number`,
      [this.context.requireStore().tenant_id,source.original_ledger_transaction_id,source.receipt_amount_minor,source.currency_code])).rows;
    if(rows.length!==2||!['debit','credit'].every(direction=>rows.some(r=>r.direction===direction&&r.amount_minor===source.receipt_amount_minor&&r.currency_code.trim()===source.currency_code.trim())))
      throw new ConflictException('The source receipt requires ledger reconciliation before a partial refund');
    return rows;
  }
  private lock(key:string){return this.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',[key]);}
  private authorize(write=true) {
    const actor=this.context.requireStore();
    if(!actor.is_authenticated||!actor.tenant_id||!actor.user_id||!['accountant','bursar','principal'].includes(actor.role??'')
      ||!actor.permissions?.some(p=>['*:*','billing:*',write?'billing:write':'billing:read'].includes(p))) throw new ForbiddenException('School finance permission is required');
    return actor;
  }
  private uuid(id:string){if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id??'')) throw new BadRequestException('Choose a valid refund or credit source');}
  private text(value:string,min:number,max:number){if(typeof value!=='string'||value.trim().length<min||value.length>max) throw new BadRequestException(`Provide between ${min} and ${max} characters of refund notes or evidence`);return value.trim();}
  private async record(row:Refund,action:string) {
    const tenant=this.context.requireStore().tenant_id,id=`fee-credit-refund:${row.id}:${action}`;
    await this.audit.record({action:`finance.credit_refund.${action}`,resource_type:'fee_credit_refund',resource_id:row.id,
      metadata:{student_id:row.student_id,receipt_id:row.receipt_id,amount_minor:row.amount_minor,status:row.status,ledger_transaction_id:row.ledger_transaction_id}});
    const recipients=action==='completed'?(await this.db.query<{user_id:string}>(`SELECT user_id FROM student_guardians
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' AND user_id IS NOT NULL UNION SELECT user_id FROM student_portal_access
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' AND user_id IS NOT NULL`,[tenant,row.student_id])).rows:[];
    await this.events.recordSchoolOperation({schoolId:tenant,event:{id,type:`fee_credit.refund_${action}`,module:'finance',entityId:row.id,
      title:'Fee credit refund',body:`Credit refund ${action}.`,payload:{student_id:row.student_id,receipt_id:row.receipt_id,status:row.status,amount_minor:row.amount_minor}},
      notifications:[{id,title:'Fee credit refund',body:`Credit refund ${action}. Open Collections to review.`,audienceRoles:['principal','accountant','bursar'],href:'/collections'},
        ...recipients.map(r=>({id:`${id}:${r.user_id}`,title:'Fee credit refunded',body:'A refund has been recorded on your fee statement.',audienceRoles:['parent','student'],targetUserId:r.user_id,href:'/fees'}))]});
  }
}
