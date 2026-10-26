import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { ACTIVE_CREDIT_APPLICATION_SQL } from './fee-credit-application-schema';

type CreditSource = { id:string; available:string; kind:'manual'|'online' };
type CreditInvoice = { id:string; total_amount_minor:string; amount_paid_minor:string };

@Injectable()
export class FeeCreditApplicationService {
  constructor(
    private readonly context:RequestContextService,
    private readonly prisma:PrismaService,
    private readonly schoolEvents:SchoolOperationalEventsService,
  ) {}

  async applyAvailable(studentId:string, reason:string, automatic=false) {
    const {tenant_id:school,user_id:actor,role}=this.context.requireStore();
    if(!school || !actor || (!automatic && !['principal','accountant','bursar'].includes(role ?? ''))) {
      throw new ForbiddenException('Finance permission and school context are required');
    }
    if(typeof reason!=='string' || reason.trim().length<5 || reason.length>1000) throw new BadRequestException('Explain why this credit is being applied');
    return this.prisma.withRequestTransaction(async()=>{
      const learner=await this.prisma.query('SELECT id FROM students WHERE tenant_id=$1 AND id::text=$2 AND deleted_at IS NULL',[school,studentId]);
      if(!learner.rows.length) throw new NotFoundException('Learner was not found in this school');
      await this.prisma.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',[`fee-credit:${school}:${studentId}`]);
      // Lock source receipts before invoices, matching the receipt reversal lock order.
      // Legacy invoice-only receipts can be recovered only through their same-school invoice.
      const manual=await this.prisma.query<CreditSource>(`
        SELECT payment.id,'manual' AS kind, (
          CASE WHEN NOT EXISTS(SELECT 1 FROM manual_fee_payment_allocations a WHERE a.tenant_id=payment.tenant_id AND a.manual_payment_id=payment.id)
            AND payment.invoice_id IS NULL THEN payment.amount_minor
          ELSE COALESCE((SELECT sum(a.amount_minor) FROM manual_fee_payment_allocations a
            WHERE a.tenant_id=payment.tenant_id AND a.manual_payment_id=payment.id AND a.allocation_type='credit'
              AND (a.student_id::text=$2 OR (a.student_id IS NULL AND original.metadata->>'student_id'=$2))),0) END
          - COALESCE((SELECT sum(applied.amount_minor) FROM (${ACTIVE_CREDIT_APPLICATION_SQL}) applied
            WHERE applied.tenant_id=payment.tenant_id AND applied.source_kind='manual' AND applied.source_id=payment.id),0)
        )::text AS available
        FROM manual_fee_payments payment LEFT JOIN invoices original ON original.tenant_id=payment.tenant_id AND original.id::text=payment.invoice_id::text
        WHERE payment.tenant_id=$1 AND COALESCE(payment.student_id::text,original.metadata->>'student_id')=$2
          AND payment.status='cleared' AND payment.currency_code='KES'
        ORDER BY payment.created_at,payment.id FOR UPDATE OF payment`,[school,studentId]);
      const online=await this.prisma.query<CreditSource>(`SELECT id,'online' AS kind,remaining_amount_minor::text AS available
        FROM student_fee_credits WHERE tenant_id=$1 AND student_id::text=$2 AND remaining_amount_minor>0
        ORDER BY created_at,id FOR UPDATE`,[school,studentId]);
      const sources=[...manual.rows,...online.rows].filter(source=>BigInt(source.available)>0n);
      if(!sources.length) return {applied_amount_minor:'0',applications:[]};
      const invoices=await this.prisma.query<CreditInvoice>(`SELECT id,total_amount_minor::text,amount_paid_minor::text
        FROM invoices WHERE tenant_id=$1 AND metadata->>'student_id'=$2 AND status IN ('open','pending_payment')
          AND currency_code='KES' AND amount_paid_minor<total_amount_minor
        ORDER BY due_at,issued_at,created_at,id FOR UPDATE`,[school,studentId]);
      let totalApplied=0n;
      const applications:Array<{id:string;invoice_id:string;amount_minor:string}>=[];
      for(const source of sources) {
        let available=BigInt(source.available);
        for(const invoice of invoices.rows) {
          const balance=BigInt(invoice.total_amount_minor)-BigInt(invoice.amount_paid_minor);
          if(available===0n) break;
          if(balance<=0n) continue;
          const applied=available<balance?available:balance;
          const inserted=(await this.prisma.query<{id:string}>(`INSERT INTO fee_credit_applications
            (tenant_id,student_id,source_kind,source_id,invoice_id,amount_minor,reason,created_by)
            VALUES($1,$2,$3,$4::uuid,$5::uuid,$6::bigint,$7,$8) RETURNING id`,
          [school,studentId,source.kind,source.id,invoice.id,applied.toString(),reason.trim(),actor])).rows[0];
          await this.prisma.query(`UPDATE invoices SET amount_paid_minor=amount_paid_minor+$3::bigint,
            status=CASE WHEN amount_paid_minor+$3::bigint>=total_amount_minor THEN 'paid' ELSE 'pending_payment' END,
            paid_at=CASE WHEN amount_paid_minor+$3::bigint>=total_amount_minor THEN now() ELSE NULL END,updated_at=now()
            WHERE tenant_id=$1 AND id::text=$2::uuid::text`,[school,invoice.id,applied.toString()]);
          if(source.kind==='online') await this.prisma.query(`UPDATE student_fee_credits SET remaining_amount_minor=remaining_amount_minor-$3::bigint,
            updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid`,[school,source.id,applied.toString()]);
          invoice.amount_paid_minor=(BigInt(invoice.amount_paid_minor)+applied).toString();
          available-=applied; totalApplied+=applied;
          applications.push({id:inserted.id,invoice_id:invoice.id,amount_minor:applied.toString()});
          await this.record(school,inserted.id,'applied',{student_id:studentId,source_kind:source.kind,source_id:source.id,
            invoice_id:invoice.id,amount_minor:applied.toString(),reason:reason.trim(),automatic});
        }
      }
      return {applied_amount_minor:totalApplied.toString(),applications};
    });
  }

  /** Internal part of the already-approved receipt reversal, in its transaction. */
  async reverseManualApplications(paymentId:string,reason:string) {
    const {tenant_id:school,user_id:actor}=this.context.requireStore();
    if(!school || !actor) throw new ForbiddenException('School and actor are required');
    // Caller holds this receipt lock. Re-locking ensures serialization for internal retries.
    const payment=await this.prisma.query('SELECT id FROM manual_fee_payments WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE',[school,paymentId]);
    if(!payment.rows.length) throw new NotFoundException('Receipt was not found in this school');
    const applications=await this.prisma.query<{id:string;invoice_id:string;amount_minor:string;student_id:string}>(`
      SELECT application.id,application.invoice_id,application.amount_minor::text,application.student_id
      FROM (${ACTIVE_CREDIT_APPLICATION_SQL}) application JOIN invoices invoice
        ON invoice.tenant_id=application.tenant_id AND invoice.id::text=application.invoice_id::text
      WHERE application.tenant_id=$1 AND application.source_kind='manual' AND application.source_id=$2::uuid
      ORDER BY invoice.due_at,invoice.issued_at,invoice.created_at,invoice.id,application.id FOR UPDATE OF invoice`,[school,paymentId]);
    for(const application of applications.rows) {
      const updated=await this.prisma.query(`UPDATE invoices SET amount_paid_minor=amount_paid_minor-$3::bigint,
        status=CASE WHEN status IN ('void','uncollectible') THEN status WHEN amount_paid_minor-$3::bigint>=total_amount_minor THEN 'paid'
          WHEN amount_paid_minor-$3::bigint>0 THEN 'pending_payment' ELSE 'open' END,
        paid_at=CASE WHEN amount_paid_minor-$3::bigint>=total_amount_minor THEN paid_at ELSE NULL END,updated_at=now()
        WHERE tenant_id=$1 AND id::text=$2::uuid::text AND amount_paid_minor>=$3::bigint RETURNING id`,[school,application.invoice_id,application.amount_minor]);
      if(!updated.rows.length) throw new ConflictException('Invoice credit history needs reconciliation before reversing this receipt');
      const reversal=(await this.prisma.query<{id:string}>(`INSERT INTO fee_credit_application_reversals(tenant_id,application_id,reason,created_by)
        VALUES($1,$2::uuid,$3,$4) RETURNING id`,[school,application.id,reason,actor])).rows[0];
      await this.record(school,reversal.id,'reversed',{...application,payment_id:paymentId,reason});
    }
  }

  private async record(school:string,id:string,action:string,payload:Record<string,unknown>) {
    if(!this.schoolEvents) throw new ConflictException('Finance audit service is unavailable');
    await this.schoolEvents.recordSchoolOperation({schoolId:school,event:{id:`fee-credit:${id}:${action}`,type:`fee_credit.${action}`,
      module:'finance',entityId:id,title:`Fee credit ${action}`,body:'Existing receipt credit updated the learner invoice balance.',payload}});
  }
}
