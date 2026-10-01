import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { PrismaService } from "../../database/prisma.service";
import { ManualFeePaymentService } from "../billing/manual-fee-payment.service";
import { InvoicesRepository } from "../billing/repositories/invoices.repository";
import { EventPublisherService } from "../events/event-publisher.service";
import { SchoolOperationNotificationsRepository } from "../events/repositories/school-operation-notifications.repository";
import { AuditLogService } from "../observability/audit-log.service";
import { CollectionSuspenseService } from "./collection-suspense.service";
import { CollectionReferenceMatcher } from './collection-reference-matcher.service';
import {
  CollectionPaymentInput,
  normalizeCollectionInput,
} from "./collection-payment.types";

export interface CollectionPayment extends CollectionPaymentInput {
  id: string;
  tenant_id: string;
  revision_id: string | null;
  channel_id: string | null;
  source: "provider" | "statement";
  status:
    | "pending_review"
    | "verified"
    | "unmatched"
    | "posted"
    | "rejected"
    | "reversed";
  student_id: string | null;
  invoice_id: string | null;
  manual_fee_payment_id: string | null;
  payment_intent_id: string | null;
  ledger_transaction_id: string | null;
  receipt_number: string | null;
  requested_by: string | null;
  suspense_transaction_id: string | null;
  suspense_release_transaction_id: string | null;
  asset_account_code: string | null;
  fee_control_account_code: string | null;
}

@Injectable()
export class CollectionPaymentsService {
  constructor(
    private readonly db: PrismaService,
    private readonly context: RequestContextService,
    private readonly manual: ManualFeePaymentService,
    private readonly invoices: InvoicesRepository,
    private readonly events: EventPublisherService,
    private readonly audit: AuditLogService,
    private readonly notifications: SchoolOperationNotificationsRepository,
    private readonly suspense: CollectionSuspenseService,
    @Optional() private readonly referenceMatcher?: CollectionReferenceMatcher,
  ) {}

  async list(limit = 50, offset = 0) {
    const tenant = this.actor(["accountant", "bursar", "principal"]);
    return (
      await this.db.query<CollectionPayment>(
        `SELECT p.*,r.display_name AS channel_name FROM collection_payments p
      LEFT JOIN tenant_payment_channel_revisions r ON r.tenant_id=p.tenant_id AND r.id=p.revision_id
      WHERE p.tenant_id=$1 ORDER BY p.created_at DESC,p.id LIMIT $2 OFFSET $3`,
        [tenant, limit, offset],
      )
    ).rows;
  }
  async statement(
    revisionId: string,
    input: Omit<
      CollectionPaymentInput,
      "provider_code" | "destination_account" | "currency_code"
    >,
    evidence: string,
  ) {
    const tenant = this.actor(["accountant", "bursar"]);
    return this.db.withRequestTransaction(async () => {
      const revision = (
        await this.db.query<{
          provider_code: string;
          account_number: string;
          channel_id: string;
        }>(
          `SELECT provider_code,account_number,channel_id FROM tenant_payment_channel_revisions WHERE tenant_id=$1 AND id=$2::uuid AND environment='production' AND status IN ('active','superseded','suspended')`,
          [tenant, revisionId],
        )
      ).rows[0];
      if (!revision)
        throw new NotFoundException(
          "Choose an activated school payment channel",
        );
      const payment = await this.claim(
        tenant,
        {
          ...input,
          provider_code: revision.provider_code,
          destination_account: revision.account_number,
          currency_code: "KES",
        },
        {
          revision_id: revisionId,
          channel_id: revision.channel_id,
          source: "statement",
          evidence_reference: evidence.trim(),
        },
      );
      if (payment.status === "pending_review")
        await this.record(payment, "review_requested", ["principal"]);
      return payment;
    });
  }
  async decide(id: string, decision: "approve" | "reject", reason: string) {
    const tenant = this.actor(["principal"]);
    return this.db.withRequestTransaction(async () => {
      const payment = await this.lock(tenant, id);
      if (payment.status !== "pending_review")
        throw new ConflictException(
          "This statement entry has already been reviewed",
        );
      if (payment.requested_by === this.context.requireStore().user_id)
        throw new ForbiddenException(
          "The requester cannot confirm their own statement",
        );
      const updated = (
        await this.db.query<CollectionPayment>(
          `UPDATE collection_payments SET status=$3,reviewed_by=$4::uuid,reviewed_at=NOW(),review_reason=$5,updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,
          [
            tenant,
            id,
            decision === "approve" ? "verified" : "rejected",
            this.context.requireStore().user_id,
            reason.trim(),
          ],
        )
      ).rows[0];
      await this.record(
        updated,
        decision === "approve" ? "statement_confirmed" : "statement_rejected",
        ["accountant", "bursar"],
      );
      return decision === "approve" ? this.post(updated) : updated;
    });
  }
  async match(id: string, studentId: string, reason: string) {
    const tenant = this.actor(["accountant", "bursar"]);
    return this.db.withRequestTransaction(async () => {
      const payment = await this.lock(tenant, id);
      if (!["verified", "unmatched"].includes(payment.status))
        throw new ConflictException(
          "Only confirmed unmatched collections may be allocated",
        );
      await this.requireStudent(tenant, studentId);
      return this.post(payment, studentId, { reason });
    });
  }

  // Internal adapter boundary. Deliberately no HTTP endpoint accepts "verified".
  // Caller must validate provider evidence before entering this transaction.
  async recognizeVerified(
    tenant: string,
    input: CollectionPaymentInput,
    channelId: string | null,
    studentId?: string,
    ledgerAccounts?: {
      asset_account_code: string | null;
      fee_control_account_code: string | null;
    },
    reviewedTarget?: { invoice_id?: string; reason: string },
  ) {
    this.assertScope(tenant);
    input = normalizeCollectionInput(input);
    return this.db.withRequestTransaction(async () => {
      const revision = (
        await this.db.query<{ id: string; channel_id: string }>(
          `SELECT id,channel_id FROM tenant_payment_channel_revisions
        WHERE tenant_id=$1 AND provider_code=$3 AND account_number=$4
          AND environment='production'
          AND ($2::uuid IS NULL OR channel_id=$2::uuid) AND activated_at<=$5::timestamptz
          AND status IN ('active','superseded','suspended') ORDER BY activated_at DESC LIMIT 1`,
          [
            tenant,
            channelId,
            input.provider_code,
            input.destination_account,
            input.occurred_at,
          ],
        )
      ).rows[0];
      if (!revision) {
        // Only an existing, school-owned M-PESA channel may predate approval
        // revisions. New providers must arrive through an activated revision.
        const legacy =
          input.provider_code === "safaricom" && channelId
            ? await this.db.query(
                `SELECT 1 FROM tenant_payment_channels channel
              JOIN tenant_mpesa_configs config ON config.tenant_id=channel.tenant_id AND config.id=channel.mpesa_config_id
              WHERE channel.tenant_id=$1 AND channel.id=$2::uuid AND config.shortcode=$3 AND config.environment='production'
                AND NOT EXISTS(SELECT 1 FROM tenant_payment_channel_revisions r WHERE r.tenant_id=channel.tenant_id AND r.channel_id=channel.id)`,
                [tenant, channelId, input.destination_account],
              )
            : null;
        if (!legacy?.rows.length)
          throw new ConflictException(
            "Payment destination has no approved historical school channel",
          );
      }
      const payment = await this.claim(tenant, input, {
        revision_id: revision?.id ?? null,
        channel_id: revision?.channel_id ?? channelId,
        source: "provider",
        ledgerAccounts,
      });
      if (
        payment.source === "statement" &&
        payment.status === "pending_review"
      ) {
        // Retain the statement as evidence; a reviewer must resolve this competing claim.
        throw new ConflictException(
          "This transaction is already awaiting statement review",
        );
      }
      if (["posted", "reversed", "rejected"].includes(payment.status)) {
        if (studentId && payment.student_id && studentId !== payment.student_id)
          throw new ConflictException(
            "This transaction is already allocated to a different student",
          );
        if (
          reviewedTarget?.invoice_id &&
          payment.invoice_id !== reviewedTarget.invoice_id
        )
          throw new ConflictException(
            "This transaction is already allocated; use the approved reversal workflow to correct it",
          );
        return payment;
      }
      return this.post(payment, studentId, reviewedTarget);
    });
  }

  async requestReversal(id: string, reason: string) {
    const tenant = this.actor(["accountant", "bursar"]);
    return this.db.withRequestTransaction(async () => {
      const payment = await this.lock(tenant, id);
      if (payment.status !== "posted" || !payment.manual_fee_payment_id)
        throw new ConflictException(
          "This payment cannot be reversed through the collection workflow",
        );
      const result = await this.db.query(
        `INSERT INTO collection_reversal_requests(tenant_id,payment_id,reason,requested_by) VALUES($1,$2::uuid,$3,$4::uuid) RETURNING *`,
        [tenant, id, reason.trim(), this.context.requireStore().user_id],
      );
      await this.record(payment, "reversal_requested", ["principal"]);
      return result.rows[0];
    });
  }
  async listReversals() {
    const tenant = this.actor(["accountant", "bursar", "principal"]);
    return (
      await this.db.query(
        `SELECT r.*,p.provider_transaction_id,p.amount_minor::text,p.receipt_number FROM collection_reversal_requests r
      JOIN collection_payments p ON p.tenant_id=r.tenant_id AND p.id=r.payment_id WHERE r.tenant_id=$1 ORDER BY r.created_at DESC LIMIT 100`,
        [tenant],
      )
    ).rows;
  }
  async decideReversal(
    id: string,
    decision: "approve" | "reject",
    reason: string,
  ) {
    const tenant = this.actor(["principal"]);
    return this.db.withRequestTransaction(async () => {
      const request = (
        await this.db.query<{
          payment_id: string;
          requested_by: string;
          status: string;
          reason: string;
        }>(
          `SELECT * FROM collection_reversal_requests WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,
          [tenant, id],
        )
      ).rows[0];
      if (!request)
        throw new NotFoundException("Reversal request was not found");
      if (request.status !== "pending")
        throw new ConflictException("Reversal request was already reviewed");
      if (request.requested_by === this.context.requireStore().user_id)
        throw new ForbiddenException("The requester cannot approve a reversal");
      const payment = await this.lock(tenant, request.payment_id);
      const result = await this.db.query(
        `UPDATE collection_reversal_requests SET status=$3,reviewed_by=$4::uuid,reviewed_at=NOW(),decision_reason=$5 WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,
        [
          tenant,
          id,
          decision === "approve" ? "approved" : "rejected",
          this.context.requireStore().user_id,
          reason.trim(),
        ],
      );
      if (decision === "approve") {
        if (payment.status !== "posted" || !payment.manual_fee_payment_id)
          throw new ConflictException(
            "Only posted collections can be reversed",
          );
        await this.manual.reverseManualFeePayment(
          payment.manual_fee_payment_id,
          { notes: `Approved reversal ${id}: ${reason}` },
        );
        await this.db.query(
          `UPDATE collection_payments SET status='reversed',updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`,
          [tenant, payment.id],
        );
      }
      await this.record(
        payment,
        decision === "approve" ? "reversed" : "reversal_rejected",
        ["accountant", "bursar", "principal"],
      );
      return result.rows[0];
    });
  }

  private async claim(
    tenant: string,
    raw: CollectionPaymentInput,
    source: {
      revision_id: string | null;
      channel_id: string | null;
      source: "provider" | "statement";
      evidence_reference?: string;
      ledgerAccounts?: {
        asset_account_code: string | null;
        fee_control_account_code: string | null;
      };
    },
  ) {
    const input = normalizeCollectionInput(raw);
    await this.db.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text`,
      [`collection:${input.provider_code}:${input.provider_transaction_id}`],
    );
    await this.db.query(
      `INSERT INTO collection_payments(tenant_id,revision_id,channel_id,provider_code,provider_transaction_id,destination_account,amount_minor,currency_code,account_reference,occurred_at,source,status,requested_by,evidence_reference,asset_account_code,fee_control_account_code)
      VALUES($1,$2::uuid,$3::uuid,$4,$5,$6,$7::bigint,$8,$9,$10::timestamptz,$11,$12,$13::uuid,$14,
        COALESCE(NULLIF($15::text,''),CASE WHEN $4='safaricom' THEN COALESCE((SELECT NULLIF(mpesa_clearing_account_code,'') FROM tenant_financial_accounts WHERE tenant_id=$1),'1110-MPESA-CLEARING') ELSE '1120-BANK-CLEARING' END),
        COALESCE(NULLIF($16::text,''),(SELECT NULLIF(fee_control_account_code,'') FROM tenant_financial_accounts WHERE tenant_id=$1),'1100-AR-FEES')) ON CONFLICT DO NOTHING`,
      [
        tenant,
        source.revision_id,
        source.channel_id,
        input.provider_code,
        input.provider_transaction_id,
        input.destination_account,
        input.amount_minor,
        input.currency_code,
        input.account_reference,
        input.occurred_at,
        source.source,
        source.source === "statement" ? "pending_review" : "verified",
        source.source === "statement"
          ? this.context.requireStore().user_id
          : null,
        source.evidence_reference ?? null,
        source.ledgerAccounts?.asset_account_code ?? null,
        source.ledgerAccounts?.fee_control_account_code ?? null,
      ],
    );
    const payment = (
      await this.db.query<CollectionPayment>(
        `SELECT *,amount_minor::text FROM collection_payments WHERE tenant_id=$1 AND provider_code=$2 AND provider_transaction_id=$3 AND destination_account=$4 FOR UPDATE`,
        [
          tenant,
          input.provider_code,
          input.provider_transaction_id,
          input.destination_account,
        ],
      )
    ).rows[0];
    if (
      !payment ||
      payment.amount_minor !== input.amount_minor ||
      payment.destination_account !== input.destination_account ||
      payment.currency_code !== input.currency_code
    )
      throw new ConflictException(
        "Transaction identity conflicts with a previously received payment; reconciliation is required",
      );
    return payment;
  }
  private async post(
    payment: CollectionPayment,
    explicitStudent?: string,
    reviewedTarget?: { invoice_id?: string; reason: string },
  ) {
    // During adoption, old STK/C2B receipts remain authoritative. Do not credit
    // a historical payment again merely because it has no unified inbox row.
    if (payment.provider_code === "safaricom") {
      const historical = await this.db.query(
        `SELECT 1 FROM mpesa_transactions
        WHERE tenant_id=$1 AND mpesa_receipt_number=$2 AND ledger_transaction_id IS NOT NULL
        UNION ALL SELECT 1 FROM manual_fee_payments WHERE tenant_id=$1 AND external_reference=$2
          AND payment_method='mpesa_c2b' AND status IN ('cleared','reversed') LIMIT 1`,
        [payment.tenant_id, payment.provider_transaction_id],
      );
      if (historical.rows.length)
        throw new ConflictException(
          "This receipt is already in the historical ledger; review the existing payment instead of posting it again",
        );
    }
    let studentId = explicitStudent ?? payment.student_id;
    let invoiceId: string | null = null;
    if (reviewedTarget) {
      this.actor(["accountant", "bursar"]);
      if (!studentId || !reviewedTarget.reason.trim())
        throw new BadRequestException(
          "A reviewed match requires a student and reason",
        );
      if (reviewedTarget.invoice_id) {
        const invoice = await this.invoices.lockManualFeeInvoiceForAllocation(
          payment.tenant_id,
          reviewedTarget.invoice_id,
        );
        if (!invoice || invoice.metadata?.student_id !== studentId)
          throw new ConflictException(
            "Selected student does not own the selected invoice",
          );
        invoiceId = invoice.id;
      }
      await this.audit.record({
        action: "collection.reference_matched",
        resource_type: "collection_payment",
        resource_id: payment.id,
        metadata: {
          student_id: studentId,
          invoice_id: invoiceId,
          reason: reviewedTarget.reason,
        },
      });
    }
    if (payment.account_reference && !reviewedTarget) {
      const match = await (this.referenceMatcher ?? new CollectionReferenceMatcher(this.db))
        .match(payment.tenant_id,payment.account_reference);
      if (match.reason.startsWith('ambiguous')) studentId = null;
      else if (studentId && match.student_id && studentId !== match.student_id)
        throw new ConflictException('Payment student does not own the reference');
      else studentId = match.student_id ?? studentId;
      invoiceId = match.invoice_id;
    }
    if (!studentId) {
      const suspenseId = await this.suspense.recognize(payment);
      await this.db.query(
        `UPDATE collection_payments SET status='unmatched',suspense_transaction_id=$3::uuid,updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`,
        [payment.tenant_id, payment.id, suspenseId],
      );
      if (payment.status !== "unmatched")
        await this.record(payment, "unmatched", ["accountant", "bursar"]);
      return {
        ...payment,
        status: "unmatched" as const,
        suspense_transaction_id: suspenseId,
      };
    }
    await this.requireStudent(payment.tenant_id, studentId);
    const suspenseReleaseId = await this.suspense.release(payment);
    const receipt = await this.manual.createManualFeePayment({
      idempotency_key: `collection:${payment.id}`,
      payment_method:
        payment.provider_code === "safaricom" ? "mpesa_c2b" : "bank_deposit",
      amount_minor: payment.amount_minor,
      student_id: studentId,
      invoice_id: invoiceId ?? undefined,
      received_at: new Date(payment.occurred_at).toISOString(),
      deposit_reference: payment.provider_transaction_id,
      external_reference: payment.provider_transaction_id,
      asset_account_code: payment.asset_account_code ?? undefined,
      fee_control_account_code: payment.fee_control_account_code ?? undefined,
      metadata: {
        source: "collection_payment",
        collection_payment_id: payment.id,
        channel_id: payment.channel_id,
        revision_id: payment.revision_id,
        provider_code: payment.provider_code,
      },
    });
    const result = (
      await this.db.query<CollectionPayment>(
        `UPDATE collection_payments SET status='posted',student_id=$3,invoice_id=$4::uuid,manual_fee_payment_id=$5::uuid,ledger_transaction_id=$6::uuid,receipt_number=$7,suspense_release_transaction_id=$8::uuid,updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid RETURNING *,amount_minor::text`,
        [
          payment.tenant_id,
          payment.id,
          studentId,
          invoiceId,
          receipt.id,
          receipt.ledger_transaction_id,
          receipt.receipt_number,
          suspenseReleaseId,
        ],
      )
    ).rows[0];
    await this.record(result, "received", [
      "accountant",
      "bursar",
      "principal",
    ]);
    return result;
  }
  private async requireStudent(tenant: string, id: string) {
    const result = await this.db.query(
      `SELECT id FROM students WHERE tenant_id=$1 AND id::text=$2`,
      [tenant, id],
    );
    if (!result.rows[0])
      throw new NotFoundException("Student was not found in this school");
  }
  private async lock(tenant: string, id: string) {
    const payment = (
      await this.db.query<CollectionPayment>(
        "SELECT *,amount_minor::text FROM collection_payments WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE",
        [tenant, id],
      )
    ).rows[0];
    if (!payment)
      throw new NotFoundException("Payment was not found in this school");
    return payment;
  }
  private assertScope(tenant: string) {
    if (this.context.requireStore().tenant_id !== tenant)
      throw new ForbiddenException("Payment school scope mismatch");
  }
  private actor(roles: string[]) {
    const actor = this.context.requireStore();
    if (
      !actor.is_authenticated ||
      !actor.tenant_id ||
      !roles.includes(actor.role ?? "")
    )
      throw new ForbiddenException(
        "Your school role cannot perform this collection action",
      );
    return actor.tenant_id;
  }
  private async record(
    payment: CollectionPayment,
    action: string,
    roles: string[],
  ) {
    const id = randomUUID();
    const title = `Payment ${action.replaceAll("_", " ")}`;
    const minor = BigInt(payment.amount_minor);
    const body = `${payment.provider_transaction_id}: KES ${minor / 100n}.${(minor % 100n).toString().padStart(2, "0")}.`;
    const notification = {
      id,
      title,
      body,
      audienceRoles: roles,
      href: "/fees",
      sourceModule: "finance",
      relatedRecordId: payment.id,
    };
    await this.audit.record({
      action: `collection.${action}`,
      resource_type: "collection_payment",
      resource_id: payment.id,
      metadata: {
        provider_code: payment.provider_code,
        amount_minor: payment.amount_minor,
        student_id: payment.student_id,
        ledger_transaction_id: payment.ledger_transaction_id,
      },
    });
    await this.events.publish({
      event_key: `collection.${action}:${id}`,
      event_name: "school.operation.recorded",
      aggregate_type: "collection_payment",
      aggregate_id: payment.id,
      payload: {
        tenant_id: payment.tenant_id,
        school_id: payment.tenant_id,
        operation_id: id,
        operation_type: `payment.${action}`,
        module: "finance",
        actor_role: this.context.requireStore().role ?? "system",
        title,
        body,
        entity_id: payment.id,
        severity: "info",
        target_roles: roles,
        notifications: [notification],
        sms: [],
        payload: { payment_id: payment.id, student_id: payment.student_id },
        occurred_at: new Date().toISOString(),
      },
    });
    await this.notifications.upsertFromSchoolOperation({
      tenantId: payment.tenant_id,
      operationId: id,
      notification,
    });
    if (payment.student_id && ["received", "reversed"].includes(action)) {
      const recipients = await this.db.query<{ user_id: string }>(
        `SELECT user_id FROM student_guardians
        WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' AND user_id IS NOT NULL
        UNION SELECT user_id FROM student_portal_access WHERE tenant_id=$1 AND student_id::text=$2 AND status='active'`,
        [payment.tenant_id, payment.student_id],
      );
      for (const recipient of recipients.rows) {
        await this.notifications.upsertFromSchoolOperation({
          tenantId: payment.tenant_id,
          operationId: id,
          notification: {
            ...notification,
            id: `${id}:${recipient.user_id}`,
            audienceRoles: [],
            targetUserId: recipient.user_id,
            body: `${body} Receipt: ${payment.receipt_number ?? "See fee statement"}.`,
            href: "/fees",
          },
        });
      }
    }
  }
}
