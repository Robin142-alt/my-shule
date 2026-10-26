import { BadRequestException, ConflictException, Injectable, Optional, Inject, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../observability/audit-log.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import { SchoolOperationNotificationsRepository } from '../../events/repositories/school-operation-notifications.repository';
import { PiiEncryptionService } from '../../security/pii-encryption.service';
import { PaymentChannelRevision } from '../../tenant-finance/payment-channel-workflow.types';
import { BankProviderError } from '../../tenant-finance/providers/bank-provider';
import { BankProviderRegistry } from '../../tenant-finance/providers/bank-provider-registry';
import { BANK_PROVIDER_REGISTRY } from '../../tenant-finance/providers/registered-bank-providers';
import { PaymentIngressService } from './payment-ingress.service';
import { DEFAULT_ROLE_OWNER } from '../../../auth/auth.constants';

export const BANK_REGISTRY = Symbol('BANK_REGISTRY');
interface SyncRow {
  revision_id: string; scan_date: string; earliest_at: Date; lease_token: string | null;
  attempts: number; last_error: string | null;
}

/** Durable account retrieval; adapters supply evidence and the existing inbox owns posting. */
@Injectable()
export class BankSynchronizationService {
  constructor(
    private readonly db: PrismaService,
    private readonly context: RequestContextService,
    private readonly encryption: PiiEncryptionService,
    private readonly ingress: PaymentIngressService,
    private readonly audit: AuditLogService,
    private readonly events: EventPublisherService,
    private readonly notifications: SchoolOperationNotificationsRepository,
    @Optional() @Inject(BANK_REGISTRY) private readonly registry: BankProviderRegistry = BANK_PROVIDER_REGISTRY,
  ) {}

  async list() {
    const tenant = this.requireFinance();
    return (await this.db.query(`SELECT r.id AS revision_id,r.display_name,r.provider_code,r.environment,r.status,
      s.scan_date::text,s.next_attempt_at,s.last_success_at,s.last_error,s.last_entry_count,
      CASE WHEN r.status<>'active' THEN r.status WHEN s.last_error IS NOT NULL THEN 'degraded'
        WHEN s.last_success_at IS NULL THEN 'awaiting_first_retrieval' ELSE 'active' END AS health
      FROM tenant_payment_channel_revisions r LEFT JOIN bank_connection_sync s
        ON s.tenant_id=r.tenant_id AND s.revision_id=r.id
      WHERE r.tenant_id=$1 AND r.connection_mode='bank_api' AND r.status IN ('active','suspended')
        AND r.provider_code=ANY($2::text[])
      ORDER BY r.created_at DESC,r.id`, [tenant,this.retrievalProviders()])).rows;
  }

  async requestSync(revisionId: string, reason: string, fromDate?: string) {
    const tenant = this.requireFinance(true);
    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 1000)
      throw new BadRequestException('Explain the reason for retrieving bank transactions');
    return this.db.withRequestTransaction(async () => {
      const revision = await this.revision(tenant, revisionId, true);
      if(!this.registry.adapter(revision.provider_code).retrieveTransactions)
        throw new BadRequestException('This bank uses notifications. Recover missing transactions through reviewed statements.');
      const zone = this.registry.adapter(revision.provider_code).calendar_time_zone ?? 'UTC';
      const today = this.day(new Date(), zone);
      if (fromDate !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
          !Number.isFinite(Date.parse(fromDate)) || new Date(fromDate).toISOString().slice(0,10) !== fromDate ||
          fromDate > today || fromDate < this.shift(today, -366)))
        throw new BadRequestException('Choose a valid start date within the last 366 days');
      await this.initialize(revision, zone);
      // A running worker holds a renewable lease. Staff never reset its cursor
      // underneath a provider response or an in-progress inbox commit.
      const row = (await this.db.query<SyncRow & { lease_active: boolean }>(`SELECT *,scan_date::text,
        (lease_token IS NOT NULL AND next_attempt_at>now()) AS lease_active FROM bank_connection_sync
        WHERE tenant_id=$1 AND revision_id=$2::uuid FOR UPDATE`, [tenant,revisionId])).rows[0];
      if (row.lease_active) throw new ConflictException('This bank account is being retrieved. Retry after the current check finishes.');
      if(fromDate && fromDate < this.day(new Date(row.earliest_at),zone))
        throw new BadRequestException('Automatic backfill starts at account activation. Record older payments through reviewed statement reconciliation.');
      await this.db.query(`UPDATE bank_connection_sync SET scan_date=COALESCE($3::date,scan_date),
        next_attempt_at=now(),lease_token=NULL,attempts=0,updated_at=now()
        WHERE tenant_id=$1 AND revision_id=$2::uuid`, [tenant,revisionId,fromDate ?? null]);
      await this.record(tenant,revisionId,'retrieval_requested',{reason:reason.trim(),from_date:fromDate ?? null});
      return { accepted:true, message:'Bank retrieval queued. Verified incoming payments use the normal allocation process.' };
    });
  }

  /** Called only inside the existing worker's individual-school context. */
  async hasDue(tenant:string) {
    if(tenant!==this.context.requireStore().tenant_id) throw new UnauthorizedException('School context mismatch');
    return (await this.db.query(`SELECT r.id FROM tenant_payment_channel_revisions r LEFT JOIN bank_connection_sync s
      ON s.tenant_id=r.tenant_id AND s.revision_id=r.id WHERE r.tenant_id=$1 AND r.status='active'
      AND r.connection_mode='bank_api' AND (r.provider_code=ANY($2::text[]) OR s.revision_id IS NOT NULL)
      AND (s.next_attempt_at IS NULL OR s.next_attempt_at<=now()) LIMIT 1`,[tenant,this.retrievalProviders()])).rows.length>0;
  }

  async recoverSchool(tenant: string) {
    if (tenant !== this.context.requireStore().tenant_id) throw new UnauthorizedException('School context mismatch');
    const revisions = (await this.db.query<PaymentChannelRevision>(`SELECT r.* FROM tenant_payment_channel_revisions r
      LEFT JOIN bank_connection_sync s ON s.tenant_id=r.tenant_id AND s.revision_id=r.id
      WHERE r.tenant_id=$1 AND r.status='active' AND r.connection_mode='bank_api'
        AND (r.provider_code=ANY($2::text[]) OR s.revision_id IS NOT NULL)
        AND (s.next_attempt_at IS NULL OR s.next_attempt_at<=now())
      ORDER BY s.next_attempt_at NULLS FIRST,r.id LIMIT 2`, [tenant,this.retrievalProviders()])).rows;
    for (const revision of revisions) await this.retrieve(revision);
  }

  private async retrieve(revision: PaymentChannelRevision) {
    const tenant = revision.tenant_id;
    // Registry/credential errors must also release the durable lease and appear
    // in diagnostics, rather than aborting every school's recovery sweep.
    let zone = 'UTC';
    try { zone = this.registry.adapter(revision.provider_code).calendar_time_zone ?? 'UTC'; } catch { /* reported below */ }
    await this.initialize(revision,zone);
    const token = randomUUID();
    const lease = (await this.db.query<SyncRow>(`UPDATE bank_connection_sync SET lease_token=$3::uuid,
      next_attempt_at=now()+INTERVAL '5 minutes',updated_at=now()
      WHERE tenant_id=$1 AND revision_id=$2::uuid AND next_attempt_at<=now()
      RETURNING *,scan_date::text`, [tenant,revision.id,token])).rows[0];
    if (!lease) return;
    try {
      const adapter = this.registry.adapter(revision.provider_code);
      if (!adapter.retrieveTransactions || !revision.credentials_ciphertext || !revision.environment)
        throw new BankProviderError('invalid_configuration','The approved bank connection needs supported retrieval credentials');
      await this.audit.record({action:'bank_connection.credentials_accessed',resource_type:'payment_channel_revision',resource_id:revision.id,
        metadata:{provider:revision.provider_code,purpose:'statement_retrieval',environment:revision.environment}});
      const credentials = JSON.parse(this.encryption.decrypt(revision.credentials_ciphertext,`collection-channel:${tenant}:${revision.id}:credentials`));
      const result = await adapter.retrieveTransactions({school_id:tenant,revision_id:revision.id,environment:revision.environment,
        account_number:revision.account_number,credentials}, {from_date:lease.scan_date,to_date:lease.scan_date});
      if (!result.complete || result.entries.length > 1000)
        throw new BankProviderError('invalid_evidence','The bank returned an incomplete statement. The date remains pending; reconcile or obtain a complete bank statement before continuing.');
      // Persist every entry before advancing the date. A crash can safely repeat
      // the day because the inbox has a unique transaction identity.
      for (let index=0; index<result.entries.length; index++) {
        if (index % 20 === 0) {
          const alive = await this.db.query(`UPDATE bank_connection_sync SET next_attempt_at=now()+INTERVAL '5 minutes'
            WHERE tenant_id=$1 AND revision_id=$2::uuid AND lease_token=$3::uuid RETURNING revision_id`,[tenant,revision.id,token]);
          if (!alive.rows.length) return;
        }
        const entry = result.entries[index];
        const occurred = new Date(entry.payment.occurred_at);
        if (!Number.isFinite(occurred.getTime()) || this.day(occurred,zone)!==lease.scan_date)
          throw new BankProviderError('invalid_evidence','The bank returned a transaction outside the requested statement date');
        if (new Date(entry.payment.occurred_at).getTime() >= new Date(lease.earliest_at).getTime())
          await this.ingress.acceptBankTransaction(revision.id,entry);
      }
      const today = this.day(new Date(),zone), anchor = this.day(new Date(lease.earliest_at),zone);
      // Revisit the last two completed days to catch delayed bank posting.
      const next = lease.scan_date < today ? this.shift(lease.scan_date,1) : [anchor,this.shift(today,-2)].sort().at(-1)!;
      await this.db.withRequestTransaction(async () => {
        const saved = await this.db.query(`UPDATE bank_connection_sync SET scan_date=$4::date,lease_token=NULL,attempts=0,
          next_attempt_at=now()+CASE WHEN $4::date>$5::date THEN INTERVAL '15 seconds' ELSE INTERVAL '5 minutes' END,
          last_success_at=now(),last_error=NULL,last_entry_count=$6,updated_at=now()
          WHERE tenant_id=$1 AND revision_id=$2::uuid AND lease_token=$3::uuid RETURNING revision_id`,
          [tenant,revision.id,token,next,lease.scan_date,result.entries.length]);
        if (saved.rows.length) {
          await this.db.query(`UPDATE tenant_payment_channel_revisions SET last_error=NULL
            WHERE tenant_id=$1 AND id=$2::uuid AND status='active'`,[tenant,revision.id]);
          await this.record(tenant,revision.id,'retrieval_completed',
            {scan_date:lease.scan_date,entries:result.entries.length,environment:revision.environment,recovered:Boolean(lease.last_error)});
        }
      });
    } catch (error) {
      const message = error instanceof BankProviderError ? error.message : 'Bank retrieval failed. Retry after checking the approved connection and account evidence.';
      await this.db.withRequestTransaction(async () => {
        const saved = await this.db.query(`UPDATE bank_connection_sync SET lease_token=NULL,attempts=attempts+1,
          next_attempt_at=now()+LEAST(3600,30*power(2,LEAST(attempts,7))) * INTERVAL '1 second',last_error=$4,updated_at=now()
          WHERE tenant_id=$1 AND revision_id=$2::uuid AND lease_token=$3::uuid RETURNING revision_id`,[tenant,revision.id,token,message]);
        if (saved.rows.length) {
          await this.db.query(`UPDATE tenant_payment_channel_revisions SET last_error=$3
            WHERE tenant_id=$1 AND id=$2::uuid AND status='active'`,[tenant,revision.id,message]);
          if(message !== lease.last_error) await this.record(tenant,revision.id,'retrieval_failed',{message,environment:revision.environment});
        }
      });
    }
  }

  private retrievalProviders() {return this.registry.definitions().filter(p=>p.capabilities.includes('transaction_retrieval')).map(p=>p.code);}
  private async initialize(revision: PaymentChannelRevision, zone:string) {
    if (!revision.activated_at) throw new ConflictException('Bank connection activation is incomplete');
    // A credential replacement for the same account resumes its pending date.
    // Changing the receiving account deliberately starts a new history window.
    await this.db.query(`INSERT INTO bank_connection_sync(tenant_id,revision_id,scan_date,earliest_at)
      SELECT $1,$2::uuid,COALESCE(s.scan_date,$3::date),COALESCE(s.earliest_at,$4::timestamptz)
      FROM (SELECT 1) anchor LEFT JOIN tenant_payment_channel_revisions previous
        ON previous.tenant_id=$1 AND previous.id=$5::uuid AND previous.account_number=$6 AND previous.provider_code=$7
        AND previous.connection_mode='bank_api' AND previous.environment=$8
      LEFT JOIN bank_connection_sync s ON s.tenant_id=previous.tenant_id AND s.revision_id=previous.id
      ON CONFLICT DO NOTHING`,
      [revision.tenant_id,revision.id,this.day(new Date(revision.activated_at),zone),revision.activated_at,
        revision.replaces_revision_id,revision.account_number,revision.provider_code,revision.environment]);
  }
  private async revision(tenant:string,id:string,lock=false) {
    const row=(await this.db.query<PaymentChannelRevision>(`SELECT * FROM tenant_payment_channel_revisions
      WHERE tenant_id=$1 AND id=$2::uuid${lock?' FOR SHARE':''}`,[tenant,id])).rows[0];
    if(!row || row.connection_mode!=='bank_api' || row.status!=='active') throw new BadRequestException('Choose an active bank connection in this school');
    return row;
  }
  private requireFinance(write=false) {
    const actor=this.context.requireStore();
    if(!actor.tenant_id || !actor.is_authenticated || !['accountant','bursar','principal',DEFAULT_ROLE_OWNER].includes(actor.role ?? '') ||
      !(actor.permissions ?? []).some(p=>p==='*:*'||p===(write?'billing:write':'billing:read')))
      throw new UnauthorizedException('School finance permission is required');
    return actor.tenant_id;
  }
  private day(date:Date,zone:string) { return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
  private shift(day:string,days:number) { return new Date(Date.parse(day)+days*86400000).toISOString().slice(0,10); }
  private async record(tenant:string,id:string,action:string,payload:Record<string,unknown>) {
    await this.audit.record({action:`bank_connection.${action}`,resource_type:'payment_channel_revision',resource_id:id,metadata:payload});
    const operation=randomUUID(), failed=action==='retrieval_failed';
    const notify=failed||payload.recovered===true;
    const title=failed?'Bank connection needs attention':'Bank connection recovered';
    const notification={id:operation,title,body:'Open Payment Settings to inspect retrieval and retry the connection.',
      audienceRoles:['accountant','bursar'],href:`/payment-setup?revision=${id}`,sourceModule:'finance',relatedRecordId:id};
    await this.events.publish({event_key:`bank_connection.${action}:${operation}`,event_name:'school.operation.recorded',
      aggregate_type:'payment_channel_revision',aggregate_id:id,payload:{tenant_id:tenant,school_id:tenant,
        operation_id:operation,operation_type:`bank_connection.${action}`,module:'finance',entity_id:id,
        actor_role:this.context.requireStore().role ?? 'system',title:notify?title:'Bank retrieval updated',body:notification.body,
        severity:failed?'warning':'info',target_roles:notification.audienceRoles,notifications:notify?[notification]:[],sms:[],payload,
        occurred_at:new Date().toISOString()}});
    if(notify) await this.notifications.upsertFromSchoolOperation({tenantId:tenant,operationId:operation,notification});
  }
}
