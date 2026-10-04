import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { AUTH_ANONYMOUS_USER_ID } from '../../../auth/auth.constants';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { PrismaService } from '../../../database/prisma.service';
import { PiiEncryptionService } from '../../security/pii-encryption.service';
import { AuditLogService } from '../../observability/audit-log.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import { SchoolOperationNotificationsRepository } from '../../events/repositories/school-operation-notifications.repository';
import type { ResolvedMpesaCallbackChannel } from '../services/mpesa-callback-channel.service';
import { PaymentIngressConfigService } from '../../tenant-finance/payment-ingress-config.service';
import type { PaymentChannelRevision } from '../../tenant-finance/payment-channel-workflow.types';
import { CollectionPaymentsService } from '../collection-payments.service';
import { CollectionReferenceMatcher } from '../collection-reference-matcher.service';
import { CollectionPaymentInput } from '../collection-payment.types';
import { CollectionAdapterRegistry } from './collection-adapter-registry.service';
import { CollectionAdapterChannel, CollectionVerification, verificationMatches } from './collection-adapter';

interface IngressPayment extends CollectionPaymentInput {
  id: string; tenant_id: string; revision_id: string; environment: 'sandbox' | 'production';
  state: string; attempts: number; collection_id: string | null; conflict_hash: string | null;
}
interface VerificationRequest {
  id: string; ingress_id: string; state: string; token_hash: string; expires_at: Date;
  conversation_id: string | null; evidence: CollectionVerification | null; created_at: Date;
}
export interface IngressRoute { provider: string; environment: string; tenant: string; revision: string; token: string }
const accepted = { ResultCode: 0, ResultDesc: 'Received' };

@Injectable()
export class PaymentIngressService {
  constructor(private readonly db: PrismaService, private readonly context: RequestContextService,
    private readonly encryption: PiiEncryptionService, private readonly config: PaymentIngressConfigService,
    private readonly adapters: CollectionAdapterRegistry, private readonly collections: CollectionPaymentsService,
    private readonly matcher: CollectionReferenceMatcher, private readonly audit: AuditLogService,
    private readonly events: EventPublisherService,
    private readonly notifications: SchoolOperationNotificationsRepository) {}

  async withStkChannel<T>(tenant: string, revision: string, token: string, work: (channel:ResolvedMpesaCallbackChannel)=>Promise<T>) {
    return this.inSchool(tenant, async () => {
      const channel = await this.channel(revision);
      const r = channel.revision;
      if (r.provider_code !== 'safaricom' || r.environment !== 'production' || !r.channel_id ||
          !['active','superseded','suspended'].includes(r.status) || !this.secretEquals(token,channel.credentials._callback_token ?? ''))
        throw new UnauthorizedException('Unknown school callback channel');
      return work({tenant_id:tenant,channel_id:r.channel_id,shortcode:r.account_number,environment:'production',
        requires_edge_signature:channel.credentials._callback_trust_mode==='edge_signed',requires_transaction_status:true});
    });
  }

  async receive(route: IngressRoute, payload: unknown, raw: string, headers: IncomingHttpHeaders, validation = false) {
    return this.inSchool(route.tenant, async () => {
      const channel = await this.channel(route.revision);
      const c = channel.credentials;
      if (channel.revision.provider_code !== route.provider || channel.revision.environment !== route.environment ||
          !this.secretEquals(route.token, c._callback_token ?? '') ||
          !['connecting','ready','active','superseded','suspended'].includes(channel.revision.status))
        throw new UnauthorizedException('Unknown payment callback channel');
      const adapter = this.adapters.get(route.provider);
      adapter.authenticate(channel, raw, headers);
      const payment = adapter.parse(payload);
      if (payment.destination_account !== channel.revision.account_number || payment.provider_code !== route.provider)
        throw new BadRequestException('Payment destination does not match this channel');
      if (validation) return accepted;
      const hash = createHash('sha256').update(JSON.stringify(payment)).digest('hex');
      await this.db.withRequestTransaction(async () => {
        await this.db.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text`,
          [`ingress:${route.environment}:${route.provider}:${payment.destination_account}:${payment.provider_transaction_id}`]);
        const inserted = await this.db.query<IngressPayment>(
          `INSERT INTO payment_ingress(tenant_id,revision_id,provider_code,environment,provider_transaction_id,destination_account,amount_minor,currency_code,account_reference,occurred_at,payload_hash)
           VALUES($1,$2::uuid,$3,$4,$5,$6,$7::bigint,$8,$9,$10::timestamptz,$11) ON CONFLICT DO NOTHING RETURNING *,amount_minor::text`,
          [route.tenant,route.revision,payment.provider_code,route.environment,payment.provider_transaction_id,payment.destination_account,
            payment.amount_minor,payment.currency_code,payment.account_reference,payment.occurred_at,hash]);
        if (inserted.rows[0]) { await this.record(inserted.rows[0], 'received'); return; }
        const previous = (await this.db.query<IngressPayment>(
          `SELECT *,amount_minor::text FROM payment_ingress WHERE tenant_id=$1 AND environment=$2 AND provider_code=$3
           AND destination_account=$4 AND provider_transaction_id=$5 FOR UPDATE`,
          [route.tenant,route.environment,route.provider,payment.destination_account,payment.provider_transaction_id])).rows[0];
        if (!previous) throw new ConflictException('Transaction belongs to another approved collection destination');
        if (previous.amount_minor !== payment.amount_minor || previous.account_reference !== payment.account_reference ||
            previous.currency_code !== payment.currency_code) {
          await this.db.query(`UPDATE payment_ingress SET conflict_hash=$3,review_reason='Conflicting callback identity',
            state=CASE WHEN state IN ('posted','unmatched','sandbox_verified') THEN state ELSE 'review' END,
            updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid`,
            [route.tenant,previous.id,hash]);
          await this.record(previous, 'review_required');
        }
      });
      return accepted;
    });
  }

  async result(tenant: string, id: string, token: string, body: unknown, raw: string, headers: IncomingHttpHeaders, timeout = false) {
    return this.inSchool(tenant, () => this.db.withRequestTransaction(async () => {
      const request = (await this.db.query<VerificationRequest>(
        'SELECT * FROM payment_ingress_verifications WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE', [tenant,id])).rows[0];
      if (!request || !this.secretEquals(createHash('sha256').update(token).digest('hex'),request.token_hash) ||
          new Date(request.expires_at).getTime() < Date.now()) throw new UnauthorizedException('Unknown verification callback');
      const payment = await this.payment(request.ingress_id);
      const channel = await this.channel(payment.revision_id);
      const adapter = this.adapters.get(payment.provider_code);
      adapter.authenticate(channel, raw, headers);
      if (request.state !== 'pending') return accepted;
      const evidence = timeout ? null : adapter.parseVerification(body);
      if (evidence && request.conversation_id && evidence.conversation_id !== request.conversation_id)
        throw new BadRequestException('Verification conversation mismatch');
      await this.db.query(`UPDATE payment_ingress_verifications SET state=$3,evidence=$4::jsonb WHERE tenant_id=$1 AND id=$2::uuid`,
        [tenant,id,timeout ? 'timeout' : 'received',evidence ? JSON.stringify(evidence) : null]);
      await this.db.query('UPDATE payment_ingress SET next_attempt_at=now() WHERE tenant_id=$1 AND id=$2::uuid', [tenant,payment.id]);
      return accepted;
    }));
  }

  /** Invoked by the existing payment worker. SQL leases survive Redis/process failure. */
  async recoverSchool(tenant: string) {
    const due = await this.db.withRequestTransaction(() => this.db.query<{ id: string }>(
      `WITH due AS (SELECT id FROM payment_ingress WHERE tenant_id=$1 AND state IN ('received','verifying','verified')
        AND next_attempt_at<=now() ORDER BY next_attempt_at,id LIMIT 20 FOR UPDATE SKIP LOCKED)
       UPDATE payment_ingress p SET next_attempt_at=now()+INTERVAL '2 minutes' FROM due
       WHERE p.tenant_id=$1 AND p.id=due.id RETURNING p.id`, [tenant]));
    for (const row of due.rows) {
      try { await this.process(row.id); }
      catch {
        const payment = await this.payment(row.id);
        if (payment.attempts >= 8) await this.review(payment, 'Provider verification unavailable after retries; review provider evidence');
        else await this.db.query(`UPDATE payment_ingress SET attempts=attempts+1,next_attempt_at=now()+INTERVAL '1 minute',updated_at=now()
          WHERE tenant_id=$1 AND id=$2::uuid AND state IN ('received','verifying','verified')`, [tenant,row.id]);
      }
    }
  }

  async process(id: string) {
    const tenant = this.context.requireStore().tenant_id!;
    const payment = await this.payment(id);
    if (!['received','verifying','verified'].includes(payment.state)) return;
    const channel = await this.channel(payment.revision_id);
    if (['connecting','ready'].includes(channel.revision.status)) return; // Persist callbacks arriving during registration/activation.
    if (!['active','superseded','suspended'].includes(channel.revision.status)) return this.review(payment,'Channel is not activated');
    if (channel.revision.environment !== payment.environment || channel.revision.account_number !== payment.destination_account)
      return this.review(payment,'Approved destination changed');
    const adapter = this.adapters.get(payment.provider_code);
    const request = (await this.db.query<VerificationRequest>(
      'SELECT * FROM payment_ingress_verifications WHERE tenant_id=$1 AND ingress_id=$2::uuid ORDER BY created_at DESC,id DESC LIMIT 1', [tenant,id])).rows[0];
    if (request?.state === 'received' && request.conversation_id && request.evidence) {
      if (!verificationMatches(payment,request.evidence,request.conversation_id)) return this.review(payment,'Provider did not confirm receipt, destination, amount and settlement');
      return this.finalize(payment,request);
    }
    if (request && ['pending','received'].includes(request.state) && Date.now()-new Date(request.created_at).getTime()<300000) return;
    if (payment.attempts >= 8) return this.review(payment,'Provider verification timed out; no fee credit has been posted');
    const requestId = randomUUID(), token = randomBytes(32).toString('hex');
    await this.db.withRequestTransaction(async () => {
      await this.db.query(`INSERT INTO payment_ingress_verifications(id,tenant_id,ingress_id,token_hash) VALUES($1::uuid,$2,$3::uuid,$4)`,
        [requestId,tenant,id,createHash('sha256').update(token).digest('hex')]);
      await this.db.query(`UPDATE payment_ingress SET state='verifying',attempts=attempts+1,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid AND state IN ('received','verifying')`,[tenant,id]);
    });
    try {
      const response = await adapter.requestVerification(channel,payment, {
        result: this.config.resultUrl(tenant,requestId,token,'result'), timeout: this.config.resultUrl(tenant,requestId,token,'timeout'),
      });
      await this.db.query('UPDATE payment_ingress_verifications SET conversation_id=$3 WHERE tenant_id=$1 AND id=$2::uuid', [tenant,requestId,response.conversation_id]);
    } catch (error) {
      await this.db.query(`UPDATE payment_ingress_verifications SET state='failed' WHERE tenant_id=$1 AND id=$2::uuid AND state='pending'`,[tenant,requestId]);
      throw error;
    }
  }

  private async finalize(payment: IngressPayment, request: VerificationRequest) {
    return this.db.withRequestTransaction(async () => {
      const current = await this.payment(payment.id,true);
      if (!['received','verifying','verified'].includes(current.state) || current.conflict_hash) return;
      let reference = current.account_reference;
      if (current.environment === 'sandbox') {
        const test = (await this.db.query<{account_reference:string}>(`SELECT account_reference FROM payment_sandbox_tests
          WHERE tenant_id=$1 AND revision_id=$2::uuid AND provider_reference=$3`,[current.tenant_id,current.revision_id,reference])).rows[0];
        if (!test) return this.review(current,'Sandbox reference was not issued for this school; use the approved channel simulator');
        reference = test.account_reference;
      }
      const match = await this.matcher.match(current.tenant_id,reference);
      let collectionId: string | null = null;
      let state = 'sandbox_verified';
      if (current.environment === 'production') {
        const channel = await this.channel(current.revision_id);
        const collection = await this.collections.recognizeVerified(current.tenant_id,current,channel.revision.channel_id);
        collectionId = collection.id;
        state = collection.status === 'posted' || collection.status === 'reversed' ? 'posted' : 'unmatched';
      }
      await this.db.query(`UPDATE payment_ingress SET state=$3,collection_id=$4::uuid,student_id=$5,invoice_id=$6::uuid,
        verified_at=now(),review_reason=$7,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid`,
        [current.tenant_id,current.id,state,collectionId,match.student_id,match.invoice_id,match.student_id ? null : match.reason]);
      await this.db.query(`UPDATE payment_ingress_verifications SET state='complete' WHERE tenant_id=$1 AND id=$2::uuid`,[current.tenant_id,request.id]);
      await this.record(current,state);
    });
  }

  async retry(id: string) {
    const actor = this.context.requireStore();
    if (!actor.is_authenticated || !['accountant','bursar','principal'].includes(actor.role ?? '')) throw new UnauthorizedException();
    await this.db.withRequestTransaction(async () => {
      const payment = await this.payment(id,true);
      if (payment.state !== 'review' || payment.conflict_hash) throw new ConflictException('Only non-conflicting unverified payments can be retried');
      await this.db.query(`UPDATE payment_ingress SET state='received',attempts=0,next_attempt_at=now(),review_reason=NULL WHERE tenant_id=$1 AND id=$2::uuid`,[payment.tenant_id,id]);
      await this.db.query(`UPDATE payment_ingress_verifications SET state='failed' WHERE tenant_id=$1 AND ingress_id=$2::uuid AND state IN ('pending','received')`,[payment.tenant_id,id]);
      await this.record(payment,'verification_retried');
    });
    return { accepted: true };
  }

  async list(limit = 100, offset = 0) {
    const actor = this.context.requireStore();
    if (!actor.is_authenticated || !['accountant','bursar','principal'].includes(actor.role ?? '')) throw new UnauthorizedException();
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw new BadRequestException('Invalid verification page');
    return (await this.db.query(`WITH inbox AS (
      SELECT i.*, CASE WHEN c.status IN ('posted','reversed') THEN c.status ELSE i.state END AS effective_state
      FROM payment_ingress i LEFT JOIN collection_payments c ON c.tenant_id=i.tenant_id AND c.id=i.collection_id
      WHERE i.tenant_id=$1
    ) SELECT id,revision_id,provider_code,environment,provider_transaction_id,destination_account,
      amount_minor::text,account_reference,occurred_at,effective_state AS state,review_reason,collection_id,student_id,invoice_id,verified_at,created_at,
      (conflict_hash IS NOT NULL) AS has_conflict
      FROM inbox
      ORDER BY CASE WHEN environment='production' AND (effective_state='review' OR conflict_hash IS NOT NULL) THEN 0
        WHEN environment='production' AND effective_state IN ('received','verifying','verified','unmatched') THEN 1 ELSE 2 END,
        created_at DESC,id LIMIT $2 OFFSET $3`,[actor.tenant_id,limit,offset])).rows;
  }

  private async channel(id: string): Promise<CollectionAdapterChannel> {
    const tenant = this.context.requireStore().tenant_id;
    const row = (await this.db.query<PaymentChannelRevision>('SELECT * FROM tenant_payment_channel_revisions WHERE tenant_id=$1 AND id=$2::uuid',[tenant,id])).rows[0];
    if (!row?.credentials_ciphertext || !row.connection_mode || row.connection_mode === 'statement') throw new UnauthorizedException('Unknown payment callback channel');
    return { revision: row, credentials: JSON.parse(this.encryption.decrypt(row.credentials_ciphertext,`collection-channel:${tenant}:${id}:credentials`)) };
  }
  private async payment(id: string, lock = false): Promise<IngressPayment> {
    const row = (await this.db.query<IngressPayment>(`SELECT *,amount_minor::text FROM payment_ingress WHERE tenant_id=$1 AND id=$2::uuid${lock?' FOR UPDATE':''}`,
      [this.context.requireStore().tenant_id,id])).rows[0];
    if (!row) throw new BadRequestException('Payment was not found in this school');
    return row;
  }
  private async review(payment: IngressPayment, reason: string) {
    await this.db.withRequestTransaction(async () => {
      const rows = await this.db.query(`UPDATE payment_ingress SET state='review',review_reason=$3,updated_at=now()
        WHERE tenant_id=$1 AND id=$2::uuid AND state IN ('received','verifying','verified') RETURNING id`,[payment.tenant_id,payment.id,reason]);
      if (rows.rows.length) await this.record(payment,'review_required');
    });
  }
  private async record(payment: IngressPayment, action: string) {
    await this.audit.record({ action: `payment_ingress.${action}`,resource_type:'payment_ingress',resource_id:payment.id,
      metadata:{provider:payment.provider_code,environment:payment.environment} });
    const id = randomUUID();
    const title = `Payment ${action.replaceAll('_',' ')}`;
    const body = 'Open Collections to inspect provider verification.';
    const notification = {id,title,body,audienceRoles:['accountant','bursar'],href:'/collections',sourceModule:'finance',relatedRecordId:payment.id};
    await this.events.publish({ event_key:`payment_ingress.${action}:${id}`,event_name:'school.operation.recorded',
      aggregate_type:'payment_ingress',aggregate_id:payment.id,payload:{tenant_id:payment.tenant_id,school_id:payment.tenant_id,
        operation_id:id,operation_type:`payment.${action}`,module:'finance',entity_id:payment.id,
        actor_role:this.context.requireStore().role ?? 'system',title,body,severity:action==='review_required'?'warning':'info',
        target_roles:notification.audienceRoles,notifications:[notification],sms:[],payload:{ingress_id:payment.id,environment:payment.environment},occurred_at:new Date().toISOString()} });
    await this.notifications.upsertFromSchoolOperation({tenantId:payment.tenant_id,operationId:id,notification});
  }
  private secretEquals(a: string,b: string) {
    return /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) && timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
  }
  private inSchool<T>(tenant: string, work: () => Promise<T>): Promise<T> {
    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(tenant)) throw new UnauthorizedException('Unknown school callback');
    return this.context.run({...this.context.requireStore(),tenant_id:tenant,user_id:AUTH_ANONYMOUS_USER_ID,
      role:'mpesa',is_authenticated:false,permissions:[]},work);
  }
}
