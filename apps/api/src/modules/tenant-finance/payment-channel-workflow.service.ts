import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID, randomBytes } from "node:crypto";
import { SUPERADMIN_ROLE_OWNER } from "../../auth/auth.constants";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { PrismaService } from "../../database/prisma.service";
import { AuditLogService } from "../observability/audit-log.service";
import { EventPublisherService } from "../events/event-publisher.service";
import { SchoolOperationNotificationsRepository } from "../events/repositories/school-operation-notifications.repository";
import { PiiEncryptionService } from "../security/pii-encryption.service";
import { TenantFinanceConfigRepository } from "./tenant-finance-config.repository";
import { TenantFinanceConfigService } from "./tenant-finance-config.service";
import {
  ConnectPaymentChannelDto,
  DecidePaymentChannelDto,
  RequestPaymentChannelDto,
  SandboxPaymentTestDto,
} from "./dto/payment-channel-workflow.dto";
import {
  COLLECTION_PROVIDERS,
  collectionProvider,
} from "./payment-provider.catalog";
import { PaymentChannelConnectionService } from "./payment-channel-connection.service";
import { PaymentChannelQueryDto } from "./dto/payment-channel-query.dto";
import {
  PaymentChannelRevision,
  PaymentChannelRevisionView,
} from "./payment-channel-workflow.types";

@Injectable()
export class PaymentChannelWorkflowService {
  constructor(
    private readonly context: RequestContextService,
    private readonly db: PrismaService,
    private readonly encryption: PiiEncryptionService,
    private readonly finance: TenantFinanceConfigService,
    private readonly repository: TenantFinanceConfigRepository,
    private readonly connection: PaymentChannelConnectionService,
    private readonly audit: AuditLogService,
    private readonly events: EventPublisherService,
    private readonly notifications: SchoolOperationNotificationsRepository,
  ) {}

  providers() {
    return COLLECTION_PROVIDERS;
  }

  async instructions() {
    const tenantId = this.schoolActor([
      "accountant",
      "bursar",
      "principal",
      "parent",
      "student",
    ]);
    return (
      await this.db.query(
        `SELECT id,provider_code,channel_kind,display_name,account_name,account_number,paybill_number,bank_name
      FROM tenant_payment_channel_revisions WHERE tenant_id=$1 AND status='active' AND environment='production' ORDER BY display_name,id`,
        [tenantId],
      )
    ).rows;
  }

  async list(query = new PaymentChannelQueryDto()): Promise<PaymentChannelRevisionView[]> {
    const tenantId = this.schoolActor(["accountant", "bursar", "principal"]);
    return this.listRevisions(tenantId, query);
  }

  async platformList(
    limit = 50,
    offset = 0,
    query = new PaymentChannelQueryDto(),
  ): Promise<PaymentChannelRevisionView[]> {
    this.platformActor();
    return this.listRevisions(null, { ...query, limit, offset });
  }

  private async listRevisions(tenantId: string | null, query: PaymentChannelQueryDto) {
    const result = await this.db.query<PaymentChannelRevision>(
      `SELECT r.*, t.name AS school_name FROM tenant_payment_channel_revisions r
       JOIN tenants t ON t.tenant_id=r.tenant_id
       WHERE ($1::text IS NULL OR r.tenant_id=$1)
         AND ($2='all' OR r.status=$2
           OR ($2='connection' AND r.status IN ('approved','connecting','ready'))
           OR ($2='attention' AND ${this.attentionPredicate()}))
         AND ($3='' OR strpos(lower(concat_ws(' ',t.name,r.provider_code,r.display_name,r.account_number)),lower($3))>0)
         AND ($4::uuid IS NULL OR r.id=$4::uuid)
       ORDER BY CASE WHEN $1::text IS NULL AND r.status IN ('approved','connecting','ready') THEN -1
         WHEN r.status='pending_approval' THEN 0
         WHEN r.status IN ('approved','connecting','ready') THEN 1
         WHEN r.status='suspended' THEN 2 ELSE 3 END,
         r.created_at DESC, r.id LIMIT $5 OFFSET $6`,
      [tenantId, query.status, query.search?.trim() ?? "", query.revision ?? null, query.limit, query.offset],
    );
    return result.rows.map((row) => this.view(row));
  }

  async summary() {
    return this.summarize(this.schoolActor(["accountant", "bursar", "principal"]));
  }

  async platformSummary() {
    this.platformActor();
    return this.summarize(null);
  }

  private attentionPredicate() {
    return `(r.status IN ('rejected','suspended') OR (r.status IN ('connecting','ready','active') AND r.last_error IS NOT NULL))
      AND NOT EXISTS (SELECT 1 FROM tenant_payment_channel_revisions newer
        WHERE newer.tenant_id=r.tenant_id AND newer.replaces_revision_id=r.id)`;
  }

  private async summarize(tenantId: string | null) {
    const result = await this.db.query(
      `SELECT count(*)::int AS total,
        count(*) FILTER (WHERE r.status='pending_approval')::int AS pending_approval,
        count(*) FILTER (WHERE r.status IN ('approved','connecting','ready'))::int AS awaiting_connection,
        count(*) FILTER (WHERE r.status='ready')::int AS ready,
        count(*) FILTER (WHERE r.status='active' AND r.environment='production')::int AS active,
        count(*) FILTER (WHERE r.status='active' AND r.environment='sandbox')::int AS sandbox,
        count(*) FILTER (WHERE ${this.attentionPredicate()})::int AS attention
       FROM tenant_payment_channel_revisions r WHERE ($1::text IS NULL OR r.tenant_id=$1)`,
      [tenantId],
    );
    return result.rows[0];
  }

  async health(tenantId: string, id: string) {
    return this.inPlatformSchool(tenantId, async () => {
      const revision = await this.requireRevision(tenantId, id);
      const result = await this.db.query(
        `SELECT
        (SELECT max(created_at) FROM collection_payments WHERE tenant_id=$1 AND revision_id=$2::uuid) AS last_collection_at,
        (SELECT count(*)::int FROM collection_payments WHERE tenant_id=$1 AND revision_id=$2::uuid AND status='unmatched') AS unmatched_count,
        (SELECT count(*)::int FROM collection_payments WHERE tenant_id=$1 AND revision_id=$2::uuid AND status='pending_review') AS pending_review_count,
        ((SELECT count(*)::int FROM mpesa_c2b_payments WHERE tenant_id=$1 AND payment_channel_id=$3::uuid
          AND status IN ('received_unverified','verification_requested') AND created_at<NOW()-INTERVAL '10 minutes') +
         (SELECT count(*)::int FROM payment_ingress WHERE tenant_id=$1 AND revision_id=$2::uuid AND state IN ('received','verifying') AND created_at<NOW()-INTERVAL '10 minutes')) AS delayed_confirmation_count,
        ((SELECT count(*)::int FROM mpesa_c2b_payments WHERE tenant_id=$1 AND payment_channel_id=$3::uuid
          AND status IN ('amount_mismatch','manual_review_required','missing_provider_record')) +
         (SELECT count(*)::int FROM payment_ingress WHERE tenant_id=$1 AND revision_id=$2::uuid AND (state='review' OR conflict_hash IS NOT NULL))) AS provider_exception_count`,
        [tenantId, id, revision.channel_id],
      );
      return {
        ...result.rows[0],
        checked_at: new Date().toISOString(),
        connection_mode: revision.connection_mode,
        status: revision.status,
      };
    });
  }

  async callbacks(tenantId: string, id: string) {
    return this.inPlatformSchool(tenantId, async () => {
      const revision = await this.requireRevision(tenantId,id);
      if (revision.connection_mode !== 'daraja') throw new BadRequestException('Statement channels do not have provider callbacks');
      const credentials = this.credentials(revision);
      await this.audit.record({action:'payment_channel.callback_urls_viewed',resource_type:'payment_channel_revision',resource_id:id});
      return { ...this.connection.callbackUrls(revision,credentials), environment:revision.environment,
        trust_mode:credentials._callback_trust_mode ?? 'edge_signed', sandbox_posts_live_fees:false };
    });
  }

  async request(
    dto: RequestPaymentChannelDto,
  ): Promise<PaymentChannelRevisionView> {
    const tenantId = this.schoolActor(["accountant", "bursar"]);
    const provider = collectionProvider(dto.provider_code);
    if (
      !(provider.channel_kinds as readonly string[]).includes(dto.channel_kind)
    )
      throw new BadRequestException(
        "This provider does not offer the selected channel",
      );
    const accountNumber = dto.account_number.replace(/[ -]/g, "").toUpperCase();
    if (
      dto.channel_kind === "mpesa_paybill" &&
      !/^\d{5,10}$/.test(accountNumber)
    )
      throw new BadRequestException("Enter a valid Paybill number");
    if (
      dto.channel_kind === "bank_paybill" &&
      !/^\d{5,10}$/.test(dto.paybill_number ?? "")
    )
      throw new BadRequestException(
        "Enter the bank Paybill number and the school account number",
      );
    if (
      accountNumber.length < 3 ||
      dto.display_name.trim().length < 2 ||
      dto.account_name.trim().length < 2 ||
      dto.reason.trim().length < 5
    )
      throw new BadRequestException(
        "Provide complete school account details and a reason",
      );
    return this.db.withRequestTransaction(async () => {
      if (dto.replaces_revision_id) {
        const previous = await this.requireRevision(
          tenantId,
          dto.replaces_revision_id,
          true,
        );
        if (!["active", "suspended", "rejected"].includes(previous.status))
          throw new ConflictException(
            "Only an active, suspended or rejected setup can be replaced",
          );
      }
      const rows = await this.db.query<PaymentChannelRevision>(
        `INSERT INTO tenant_payment_channel_revisions
         (tenant_id,provider_code,channel_kind,display_name,account_name,account_number,bank_name,reason,requested_by,replaces_revision_id,paybill_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::uuid,$10::uuid,$11) RETURNING *`,
        [
          tenantId,
          dto.provider_code,
          dto.channel_kind,
          dto.display_name.trim(),
          dto.account_name.trim(),
          accountNumber,
          dto.bank_name?.trim() ||
            (dto.provider_code === "safaricom" ? null : provider.name),
          dto.reason.trim(),
          this.context.requireStore().user_id,
          dto.replaces_revision_id ?? null,
          dto.channel_kind === "bank_paybill" ? dto.paybill_number : null,
        ],
      );
      await this.record(rows.rows[0], "requested", ["principal"]);
      return this.view(rows.rows[0]);
    });
  }

  async decide(
    id: string,
    dto: DecidePaymentChannelDto,
  ): Promise<PaymentChannelRevisionView> {
    const tenantId = this.schoolActor(["principal"]);
    return this.db.withRequestTransaction(async () => {
      const revision = await this.requireRevision(tenantId, id, true);
      if (revision.status !== "pending_approval")
        throw new ConflictException("This request has already been reviewed");
      if (revision.requested_by === this.context.requireStore().user_id)
        throw new ForbiddenException(
          "The requester cannot approve their own payment setup",
        );
      const result = await this.db.query<PaymentChannelRevision>(
        `UPDATE tenant_payment_channel_revisions SET status=$3, reviewed_by=$4::uuid, reviewed_at=NOW(), decision_reason=$5
         WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,
        [
          tenantId,
          id,
          dto.decision === "approve" ? "approved" : "rejected",
          this.context.requireStore().user_id,
          dto.reason.trim(),
        ],
      );
      await this.record(
        result.rows[0],
        dto.decision === "approve" ? "approved" : "rejected",
        ["accountant", "bursar"],
      );
      await this.notifications.resolveRequiredAction(tenantId, "payment_setup_review", id);
      return this.view(result.rows[0]);
    });
  }

  async connect(tenantId: string, id: string, dto: ConnectPaymentChannelDto) {
    return this.inPlatformSchool(tenantId, () =>
      this.db.withRequestTransaction(async () => {
        const revision = await this.requireRevision(tenantId, id, true);
        if (!["approved", "connecting", "ready"].includes(revision.status))
          throw new ConflictException(
            "Only an approved, inactive revision can be connected",
          );
        const provider = collectionProvider(revision.provider_code);
        if (
          !(provider.connection_modes as readonly string[]).includes(
            dto.connection_mode,
          )
        )
          throw new BadRequestException(
            "This connection method is not implemented for the provider",
          );
        const credentials: Record<string, string> = {};
        if (dto.connection_mode === 'statement' && dto.environment !== 'production')
          throw new BadRequestException('Statement channels record real bank evidence; use production');
        if (dto.connection_mode === "daraja") {
          for (const field of provider.credential_fields) {
            const value = dto.credentials[field.key];
            if (
              typeof value !== "string" ||
              !value.trim() ||
              value.length > 8192 ||
              value.startsWith("enc:")
            )
              throw new BadRequestException(`Provide ${field.label}`);
            credentials[field.key] = value.trim();
          }
          credentials._callback_token = randomBytes(32).toString('hex');
          credentials._callback_trust_mode = dto.callback_trust_mode ?? 'daraja_direct';
        } else if (Object.keys(dto.credentials).length)
          throw new BadRequestException(
            "Statement reconciliation does not require provider credentials",
          );
        const result = await this.db.query<PaymentChannelRevision>(
          `UPDATE tenant_payment_channel_revisions SET connection_mode=$3,environment=$4,credentials_ciphertext=$5,
         credential_version=credential_version+1,status='connecting',last_test_status=NULL,last_tested_at=NULL,last_error=NULL
         WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,
          [
            tenantId,
            id,
            dto.connection_mode,
            dto.environment,
            dto.connection_mode === "daraja"
              ? this.encryption.encrypt(
                  JSON.stringify(credentials),
                  this.aad(tenantId, id),
                )
              : null,
          ],
        );
        await this.record(result.rows[0], "connection_configured", [
          "accountant",
          "bursar",
          "principal",
        ]);
        return this.view(result.rows[0]);
      }),
    );
  }

  async test(tenantId: string, id: string) {
    return this.inPlatformSchool(tenantId, async () => {
      const revision = await this.requireRevision(tenantId, id);
      if (!["connecting", "ready"].includes(revision.status))
        throw new ConflictException(
          "Save an approved connection before testing",
        );
      let outcome: string;
      let failure: string | null = null;
      try {
        await this.reserveSandbox(revision);
        outcome = await this.connection.test(
          revision,
          this.credentials(revision),
        );
      } catch (error) {
        outcome = "failed";
        failure =
          error instanceof BadRequestException ||
          error instanceof ConflictException ||
          (error instanceof Error && error.name === "BadGatewayException")
            ? error.message
            : "The provider could not be reached. Retry after checking provider availability.";
      }
      return this.db.withRequestTransaction(async () => {
        const current = await this.requireRevision(tenantId, id, true);
        if (
          current.credential_version !== revision.credential_version ||
          !["connecting", "ready"].includes(current.status)
        )
          throw new ConflictException(
            "The configuration changed during testing. Test the current revision again.",
          );
        const result = await this.db.query<PaymentChannelRevision>(
          `UPDATE tenant_payment_channel_revisions SET status=$3,last_test_status=$4,last_tested_at=NOW(),last_error=$5
           WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,
          [tenantId, id, failure ? "connecting" : "ready", outcome, failure],
        );
        await this.record(
          result.rows[0],
          failure ? "connection_failed" : "connection_checked",
          ["accountant", "bursar", "principal"],
        );
        return this.view(result.rows[0]);
      });
    });
  }

  async sandboxTest(tenantId: string, id: string, dto: SandboxPaymentTestDto) {
    return this.inPlatformSchool(tenantId, async () => {
      const revision = await this.requireRevision(tenantId,id);
      if (revision.status !== 'active' || revision.environment !== 'sandbox' || revision.connection_mode !== 'daraja')
        throw new ConflictException('Activate a sandbox Daraja channel before simulating a payment');
      await this.reserveSandbox(revision);
      // A unique reference binds shared-shortcode simulations to this exact school
      // even if a provider retries delivery after another school registers URLs.
      const reference = `MS${randomBytes(5).toString('hex').toUpperCase()}`;
      await this.db.withRequestTransaction(async () => {
        await this.db.query(`INSERT INTO payment_sandbox_tests(tenant_id,revision_id,provider_reference,account_reference) VALUES($1,$2::uuid,$3,$4)`,
          [tenantId,id,reference,dto.account_reference.trim()]);
        await this.record(revision,'sandbox_test_requested',['accountant','bursar','principal']);
      });
      const credentials = this.credentials(revision);
      await this.connection.test(revision,credentials);
      await this.connection.simulate(revision,credentials,reference,dto.amount,dto.msisdn);
      return {accepted:true,provider_reference:reference,account_reference:dto.account_reference.trim(),
        message:'Simulation accepted by Safaricom. Inspect Collections for verification and matching; no live fee balance will change.'};
    });
  }

  private async reserveSandbox(revision: PaymentChannelRevision) {
    if (revision.environment !== 'sandbox') return;
    const result = await this.db.query(`INSERT INTO payment_sandbox_leases(provider_code,destination_account,tenant_id,revision_id,expires_at)
      VALUES($1,$2,$3,$4::uuid,now()+INTERVAL '15 minutes')
      ON CONFLICT(provider_code,destination_account) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,revision_id=EXCLUDED.revision_id,expires_at=EXCLUDED.expires_at
      WHERE payment_sandbox_leases.expires_at<=now() OR payment_sandbox_leases.revision_id=EXCLUDED.revision_id RETURNING revision_id`,
      [revision.provider_code,revision.account_number,revision.tenant_id,revision.id]);
    if (!result.rows.length) throw new ConflictException('Another school is testing this shared sandbox shortcode. Retry after its 15-minute test window; production channels are unaffected.');
  }

  async activate(tenantId: string, id: string) {
    return this.inPlatformSchool(tenantId, () =>
      this.db.withRequestTransaction(async () => {
        // Per-school lock orders replacement/config changes without serializing other schools.
        await this.db.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [`payment-setup:${tenantId}`],
        );
        const revision = await this.requireRevision(tenantId, id, true);
        if (
          revision.status !== "ready" ||
          !revision.last_tested_at ||
          Date.now() - new Date(revision.last_tested_at).getTime() > 86400000
        )
          throw new ConflictException(
            "A successful connection check within the last 24 hours is required",
          );
        if (revision.replaces_revision_id) {
          const old = await this.requireRevision(
            tenantId,
            revision.replaces_revision_id,
            true,
          );
          if (old.environment !== revision.environment)
            throw new ConflictException('Sandbox and production channels cannot replace one another');
          if (old.channel_id)
            await this.repository.updatePaymentChannelStatus({
              tenant_id: tenantId,
              channel_id: old.channel_id,
              status: "inactive",
            });
          await this.db.query(
            `UPDATE tenant_payment_channel_revisions SET status='superseded' WHERE tenant_id=$1 AND id=$2::uuid`,
            [tenantId, old.id],
          );
        }
        let channelId: string | null = null;
        if (revision.environment === 'sandbox') {
          // A sandbox revision uses the same ingress and verifier but cannot own
          // live payment channels or create real school ledger entries.
          if (revision.connection_mode !== 'daraja') throw new ConflictException('Only provider sandboxes can be activated for testing');
        } else if (revision.connection_mode === "daraja") {
          const credentials = this.credentials(revision);
          const summary = await this.finance.upsertMpesaConfig(tenantId, {
            shortcode: revision.account_number,
            paybill_number: revision.account_number,
            consumer_key: credentials.consumer_key,
            consumer_secret: credentials.consumer_secret,
            passkey: credentials.passkey,
            initiator_name: credentials.initiator_name,
            environment: "production",
            callback_url: this.connection.schoolStkCallbackUrl(revision,credentials),
            status: "active",
          });
          const config = summary.mpesa_configs.find(
            (item) => item.shortcode === revision.account_number,
          );
          const channel = summary.payment_channels.find(
            (item) =>
              item.mpesa_config_id === config?.id && item.status === "active",
          );
          if (!channel)
            throw new ConflictException(
              "The approved Paybill could not be activated",
            );
          channelId = channel.id;
        } else {
          const bank = await this.repository.createBankAccount({
            tenant_id: tenantId,
            bank_name:
              revision.bank_name ??
              collectionProvider(revision.provider_code).name,
            branch_name: null,
            account_name: revision.account_name,
            account_number: revision.account_number,
            currency: "KES",
            status: "active",
          });
          const result = await this.db.query<{ id: string }>(
            `INSERT INTO tenant_payment_channels (tenant_id,channel_type,name,bank_account_id,status,metadata)
           VALUES ($1,'manual_bank_deposit',$2,$3::uuid,'active',$4::jsonb) RETURNING id`,
            [
              tenantId,
              revision.display_name,
              bank.id,
              JSON.stringify({
                provider_code: revision.provider_code,
                revision_id: id,
                connection_mode: "statement",
              }),
            ],
          );
          channelId = result.rows[0].id;
        }
        const result = await this.db.query<PaymentChannelRevision>(
          `UPDATE tenant_payment_channel_revisions SET status='active',channel_id=$3::uuid,activated_at=NOW()
         WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,
          [tenantId, id, channelId],
        );
        await this.record(result.rows[0], "activated", [
          "accountant",
          "bursar",
          "principal",
        ]);
        return this.view(result.rows[0]);
      }),
    );
  }

  async suspend(tenantId: string, id: string, reason: string) {
    return this.inPlatformSchool(tenantId, () =>
      this.db.withRequestTransaction(async () => {
        const revision = await this.requireRevision(tenantId, id, true);
        if (revision.status !== "active")
          throw new ConflictException(
            "Only an active channel can be suspended",
          );
        if (revision.channel_id)
          await this.repository.updatePaymentChannelStatus({
            tenant_id: tenantId,
            channel_id: revision.channel_id,
            status: "inactive",
          });
        const result = await this.db.query<PaymentChannelRevision>(
          `UPDATE tenant_payment_channel_revisions SET status='suspended',last_error=$3 WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,
          [tenantId, id, reason.trim()],
        );
        await this.record(result.rows[0], "suspended", [
          "accountant",
          "bursar",
          "principal",
        ]);
        return this.view(result.rows[0]);
      }),
    );
  }

  private async requireRevision(tenantId: string, id: string, lock = false) {
    const result = await this.db.query<PaymentChannelRevision>(
      `SELECT * FROM tenant_payment_channel_revisions WHERE tenant_id=$1 AND id=$2::uuid${lock ? " FOR UPDATE" : ""}`,
      [tenantId, id],
    );
    if (!result.rows[0])
      throw new NotFoundException("Payment setup was not found in this school");
    return result.rows[0];
  }
  private schoolActor(roles: string[]): string {
    const actor = this.context.requireStore();
    if (
      !actor.is_authenticated ||
      !actor.tenant_id ||
      !roles.includes(actor.role ?? "")
    )
      throw new ForbiddenException(
        "Your school role cannot perform this payment setup action",
      );
    return actor.tenant_id;
  }
  private platformActor() {
    const actor = this.context.requireStore();
    if (
      !actor.is_authenticated ||
      actor.role !== SUPERADMIN_ROLE_OWNER ||
      actor.audience !== "superadmin"
    )
      throw new ForbiddenException(
        "Only a platform Super Admin can connect school payment channels",
      );
    return actor;
  }
  private inPlatformSchool<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const actor = this.platformActor();
    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(tenantId))
      throw new BadRequestException("Invalid school identity");
    return this.context.run({ ...actor, tenant_id: tenantId }, fn);
  }
  private view(row: PaymentChannelRevision): PaymentChannelRevisionView {
    const { credentials_ciphertext, ...view } = row;
    return { ...view, credentials_configured: Boolean(credentials_ciphertext) };
  }
  private aad(tenantId: string, id: string) {
    return `collection-channel:${tenantId}:${id}:credentials`;
  }
  private credentials(row: PaymentChannelRevision): Record<string, string> {
    if (!row.credentials_ciphertext) return {};
    return JSON.parse(
      this.encryption.decrypt(
        row.credentials_ciphertext,
        this.aad(row.tenant_id, row.id),
      ),
    ) as Record<string, string>;
  }
  private async record(
    row: PaymentChannelRevision,
    action: string,
    roles: string[],
  ) {
    const eventId = randomUUID();
    const title = `Payment setup: ${action.replaceAll("_", " ")}`;
    const nextStep: Record<string, string> = {
      pending_approval: "Principal: review and approve or reject the school account.",
      approved: "Approved. Awaiting Super Admin connection.",
      rejected: "Accountant: review the decision and submit a corrected setup.",
      connecting: "Super Admin is connecting and testing this account.",
      ready: "Checks passed. Awaiting Super Admin activation.",
      active: row.environment === "sandbox" ? "Sandbox testing only; live school fees are not enabled." : "School payment channel is active.",
      suspended: "Collection is suspended. Contact Super Admin or request a corrected setup.",
      superseded: "This setup has been replaced. Its history remains available.",
    };
    const body = `${row.display_name}: ${nextStep[row.status]} ${row.decision_reason ?? ""} ${row.last_error ?? ""}`.trim();
    const notification = {
      id: eventId,
      title,
      body,
      audienceRoles: roles,
      href: `/payment-setup?revision=${row.id}`,
      actionUrl: `/payment-setup?revision=${row.id}`,
      actionLabel: row.status === "pending_approval" ? "Review payment setup" : "View payment setup",
      sourceModule: "finance",
      relatedRecordId: row.id,
      actionType: action === "requested" ? "payment_setup_review" : "payment_setup",
      status: action === "requested" ? "action_required" : "unread",
      originRole: this.context.requireStore().role,
      priority: row.last_error || row.status === "pending_approval" ? "high" : "normal",
    };
    await this.audit.record({
      tenant_id: row.tenant_id,
      action: `payment_channel.${action}`,
      resource_type: "payment_channel_revision",
      resource_id: row.id,
      metadata: {
        status: row.status,
        provider: row.provider_code,
        channel_id: row.channel_id,
        credential_version: row.credential_version,
      },
    });
    await this.events.publish({
      event_key: `payment_channel.${action}:${eventId}`,
      event_name: "school.operation.recorded",
      aggregate_type: "payment_channel_revision",
      aggregate_id: row.id,
      payload: {
        tenant_id: row.tenant_id,
        school_id: row.tenant_id,
        operation_id: eventId,
        operation_type: `payment_channel.${action}`,
        module: "finance",
        actor_role: this.context.requireStore().role ?? "system",
        title,
        body,
        entity_id: row.id,
        severity: row.last_error ? "warning" : "info",
        target_roles: roles,
        notifications: [notification],
        sms: [],
        payload: { revision_id: row.id, status: row.status },
        occurred_at: new Date().toISOString(),
      },
    });
    await this.notifications.upsertFromSchoolOperation({
      tenantId: row.tenant_id,
      operationId: eventId,
      notification,
    });
  }
}
