import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { AuditLogService } from '../observability/audit-log.service';

type Snapshot={id:string;student_id:string;invoice_number:string;amount_minor:string;balance_minor:string;status?:string;
  created_at:string;due_at?:string;due_date?:string;term?:string;academic_year?:string;fee_structure_id?:string;currency_code?:string};
type Canonical={id:string;invoice_number:string;student_id:string;total:string;paid:string;currency_code:string;status:string;legacy_id:string|null};
type AdoptionItem={legacy_id:string;invoice_number:string;student_id:string;student_name:string;amount_minor:string;paid_minor:string;
  balance_minor:string;fingerprint:string;status:'ready'|'adopted'|'exception';message:string;invoice_id:string|null};
type Selected={legacy_id:string;fingerprint:string};

@Injectable()
export class LegacyFeeInvoiceAdoptionService {
  constructor(private readonly context:RequestContextService,private readonly db:PrismaService,
    private readonly events:SchoolOperationalEventsService,private readonly audit:AuditLogService){}

  async preview(limit=50,offset=0) {
    const tenant=this.actor(false);
    if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0)
      throw new BadRequestException('Invalid invoice preview page');
    return this.db.withRequestTransaction(async()=>{
      if(!(await this.db.query("SELECT to_regclass('student_invoices') AS table_name")).rows[0]?.table_name)
        return {items:[] as AdoptionItem[],has_more:false};
      const rows=await this.rows(tenant,undefined,limit+1,offset);
      const inspected=await this.inspect(tenant,rows.slice(0,limit));
      return {items:inspected.map(row=>row.item),has_more:rows.length>limit};
    });
  }
  async adopt(selected:Selected[],reason:string) {
    const tenant=this.actor(true),actor=this.context.requireStore().user_id!;
    if(typeof reason!=='string'||reason.trim().length<10||reason.length>1000)
      throw new BadRequestException('Explain how the historical invoice balances were reviewed');
    if(!Array.isArray(selected)||!selected.length||selected.length>100||new Set(selected.map(row=>row?.legacy_id)).size!==selected.length||
      selected.some(row=>typeof row?.legacy_id!=='string'||!row.legacy_id||row.legacy_id.length>100||!/^[a-f0-9]{64}$/.test(row?.fingerprint ?? '')))
      throw new BadRequestException('Choose up to 100 invoices from a fresh preview');
    return this.db.withRequestTransaction(async(tx)=>{
      // Use the same school lock as canonical invoice generation.
      await this.db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text",[tenant]);
      const rows=await this.rows(tenant,selected.map(row=>row.legacy_id),100,0,true);
      if(rows.length!==selected.length) throw new BadRequestException('An invoice was not found in this school');
      const inspected=await this.inspect(tenant,rows,true),result:Array<{legacy_id:string;invoice_id:string;already_adopted:boolean}>=[];
      const subscription=(await this.db.query<{id:string;currency_code:string}>(
        'SELECT id::text,currency_code FROM subscriptions WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[tenant])).rows[0];
      for(const row of inspected) {
        if(row.item.status==='adopted') {result.push({legacy_id:row.source.id,invoice_id:row.item.invoice_id!,already_adopted:true});continue;}
        if(row.item.fingerprint!==selected.find(item=>item.legacy_id===row.source.id)!.fingerprint)
          throw new ConflictException('A legacy invoice changed after preview. Refresh and review the current balances.');
        if(row.item.status==='exception') throw new ConflictException(`${row.item.invoice_number}: ${row.item.message}`);
        if(!subscription||subscription.currency_code.trim()!=='KES') throw new ConflictException('Complete school KES billing setup before adopting historical invoices');
        const source=row.source;
        let invoiceId=row.item.invoice_id;
        if(!invoiceId) {
          const metadata={student_id:source.student_id,student_name:row.item.student_name,academic_year:source.academic_year,term:source.term,
            fee_structure_id:source.fee_structure_id,legacy_invoice_id:source.id,legacy_opening_paid_minor:row.item.paid_minor,
            billing_reason:'legacy_invoice_adoption',source_fingerprint:row.item.fingerprint};
          const created=await this.db.query<{id:string}>(`INSERT INTO invoices(tenant_id,subscription_id,invoice_number,status,currency_code,description,
            subtotal_amount_minor,tax_amount_minor,total_amount_minor,amount_paid_minor,issued_at,due_at,created_at,metadata,id)
            VALUES($1,$2::uuid,$3,$4,'KES',$5,$6::bigint,0,$6::bigint,$7::bigint,$8::timestamptz,$9::timestamptz,$8::timestamptz,$10::jsonb,$11)
            RETURNING id::text`,[tenant,subscription.id,source.invoice_number,row.invoiceStatus,`Historical fees: ${source.invoice_number}`,
            source.amount_minor,row.item.paid_minor,source.created_at,source.due_at ?? source.due_date ?? source.created_at,JSON.stringify(metadata),source.id]);
          invoiceId=created.rows[0].id;
        }
        const id=randomUUID();
        await this.db.query(`INSERT INTO legacy_fee_invoice_adoptions(id,tenant_id,legacy_id,invoice_id,source_fingerprint,source_snapshot,reason,created_by)
          VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,[id,tenant,source.id,invoiceId,row.item.fingerprint,JSON.stringify(source),reason.trim(),actor]);
        await this.audit.record({tenant_id:tenant,action:'invoice.legacy_adopted',resource_type:'invoice',resource_id:invoiceId,
          metadata:{legacy_id:source.id,adoption_id:id,reason:reason.trim(),opening_paid_minor:row.item.paid_minor}});
        await this.events.recordSchoolOperation({schoolId:tenant,event:{id,type:'invoice.legacy_adopted',module:'finance',entityId:invoiceId,
          title:'Historical fee invoice adopted',body:`${source.invoice_number} is available in the invoice register with its original balance.`,
          payload:{legacy_id:source.id,invoice_id:invoiceId,student_id:source.student_id,opening_paid_minor:row.item.paid_minor,reason:reason.trim()}}},tx);
        result.push({legacy_id:source.id,invoice_id:invoiceId,already_adopted:false});
      }
      return {items:result,adopted:result.filter(row=>!row.already_adopted).length};
    });
  }
  private actor(write:boolean) {
    const actor=this.context.requireStore();
    if(!actor.is_authenticated||!actor.tenant_id||!actor.user_id||
      !(write?['principal','owner']:['accountant','bursar','principal','owner']).includes(actor.role ?? '')||
      !(actor.permissions ?? []).some(permission=>['*:*','billing:*',write?'billing:write':'billing:read'].includes(permission)))
      throw new ForbiddenException(write?'Principal permission is required to adopt reviewed historical balances':'School finance permission is required');
    return actor.tenant_id;
  }
  private async rows(tenant:string,ids?:string[],limit=50,offset=0,lock=false) {
    return (await this.db.query<{source:Snapshot}>(`SELECT to_jsonb(l)||jsonb_build_object('id',l.id::text,'student_id',l.student_id::text,
      'amount_minor',l.amount_minor::text,'balance_minor',l.balance_minor::text) AS source
      FROM student_invoices l WHERE l.tenant_id::text=$1 AND ($2::text[] IS NULL OR l.id::text=ANY($2))
      ORDER BY l.created_at,l.id LIMIT $3 OFFSET $4 ${lock?'FOR UPDATE':''}`,[tenant,ids ?? null,limit,offset])).rows.map(row=>row.source);
  }
  private async inspect(tenant:string,sources:Snapshot[],lock=false) {
    if(!sources.length) return [];
    const students=(await this.db.query<{id:string;name:string}>(
      "SELECT id::text,trim(concat_ws(' ',first_name,last_name)) AS name FROM students WHERE tenant_id=$1 AND id::text=ANY($2::text[])",
      [tenant,sources.map(row=>row.student_id)])).rows;
    const canonical=(await this.db.query<Canonical>(`SELECT id::text,invoice_number,metadata->>'student_id' AS student_id,
      total_amount_minor::text AS total,amount_paid_minor::text AS paid,currency_code,status,metadata->>'legacy_invoice_id' AS legacy_id FROM invoices
      WHERE tenant_id=$1 AND (invoice_number=ANY($2::text[]) OR id::text=ANY($3::text[])) ORDER BY id ${lock?'FOR UPDATE':''}`,
      [tenant,sources.map(row=>row.invoice_number),sources.map(row=>row.id)])).rows;
    const history=(await this.db.query<{legacy_id:string;invoice_id:string}>(`SELECT legacy_id,invoice_id FROM legacy_fee_invoice_adoptions
      WHERE tenant_id=$1 AND legacy_id=ANY($2::text[])`,[tenant,sources.map(row=>row.id)])).rows;
    const duplicates=(await this.db.query<{invoice_number:string}>(`SELECT invoice_number FROM student_invoices
      WHERE tenant_id::text=$1 AND invoice_number=ANY($2::text[]) GROUP BY invoice_number HAVING count(*)>1`,[tenant,sources.map(row=>row.invoice_number)])).rows;
    return sources.map(source=>{
      const previous=history.find(row=>row.legacy_id===source.id),student=students.find(row=>row.id===source.student_id);
      const matches=canonical.filter(row=>row.invoice_number===source.invoice_number||row.id===source.id);
      const item:AdoptionItem={legacy_id:source.id,invoice_number:source.invoice_number,student_id:source.student_id,student_name:student?.name ?? '',
        amount_minor:source.amount_minor,balance_minor:source.balance_minor,paid_minor:'0',fingerprint:createHash('sha256').update(JSON.stringify(source)).digest('hex'),
        status:previous?'adopted':'ready',invoice_id:previous?.invoice_id ?? null,message:previous?'Already adopted; use the invoice register':'Original total and balance will be preserved; no historical cash is reposted'};
      let invoiceStatus='open';
      if(previous) item.paid_minor=(BigInt(source.amount_minor)-BigInt(source.balance_minor)).toString();
      if(!previous) {
        const exception=(message:string)=>{item.status='exception';item.message=message;};
        if(!student) exception('Learner is missing or belongs to another school');
        else if(!source.invoice_number?.trim()||source.invoice_number.length>120) exception('Invalid historical invoice number');
        else if(!/^\d{1,19}$/.test(source.amount_minor ?? '')||!/^\d{1,19}$/.test(source.balance_minor ?? '')||
          BigInt(source.amount_minor)>9223372036854775807n||BigInt(source.balance_minor)>BigInt(source.amount_minor))
          exception('Historical total and balance must be valid nonnegative minor units; balance cannot exceed total');
        else {
          item.paid_minor=(BigInt(source.amount_minor)-BigInt(source.balance_minor)).toString();
          const status=(source.status ?? 'open').toLowerCase();
          invoiceStatus=['cancelled','canceled','void'].includes(status)?'void':status==='uncollectible'?'uncollectible':status==='draft'?'draft':
            BigInt(source.balance_minor)===0n?'paid':BigInt(item.paid_minor)>0n?'pending_payment':'open';
          if(!['open','issued','overdue','pending_payment','partially_paid','paid','cancelled','canceled','void','uncollectible','draft'].includes(status))
            exception('Historical invoice status requires review');
          else if(source.currency_code && source.currency_code!=='KES') exception('Only KES historical invoices can be adopted');
          else if(!Number.isFinite(Date.parse(source.created_at))||!Number.isFinite(Date.parse(source.due_at ?? source.due_date ?? source.created_at)))
            exception('Historical invoice dates require correction');
          else if(duplicates.some(row=>row.invoice_number===source.invoice_number)) exception('Duplicate historical invoice number requires correction');
          else if(matches.length>1) exception('More than one canonical invoice matches this record');
          else if(matches.length) {
            const match=matches[0];
            if(match.legacy_id!==source.id||match.student_id!==source.student_id||match.total!==source.amount_minor||match.paid!==item.paid_minor||
              match.currency_code.trim()!=='KES'||match.status!==invoiceStatus) exception('An existing invoice has different ownership, amounts or status; reconcile it before adoption');
            else {item.invoice_id=match.id;item.message='Matching canonical invoice exists; record lineage without changing its balance';}
          }
        }
      }
      return {source,item,invoiceStatus};
    });
  }
}
