import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RequestContextService } from '../../../common/request-context/request-context.service';
import { DatabaseService } from '../../../database/database.service';
import { TenantFinanceConfigService } from '../../tenant-finance/tenant-finance-config.service';
import {
  GenerateMpesaReconciliationReportInput,
  GenerateMpesaReconciliationRangeReportInput,
  MpesaReconciliationDiscrepancy,
  MpesaReconciliationProcessorResult,
  MpesaReconciliationRangeReport,
  MpesaReconciliationReport,
  MpesaReconciliationSummary,
} from '../payments.types';

interface SuccessfulMpesaRow {
  mpesa_transaction_id: string;
  payment_intent_id: string;
  checkout_request_id: string;
  merchant_request_id: string;
  mpesa_receipt_number: string | null;
  mpesa_amount_minor: string | null;
  ledger_transaction_id: string | null;
  transaction_occurred_at: Date | null;
  processed_at: Date | null;
  created_at: Date;
  linked_transaction_id: string | null;
  linked_transaction_reference: string | null;
  linked_transaction_amount_minor: string | null;
  linked_transaction_posted_at: Date | null;
}

interface MissingCallbackRow {
  payment_intent_id: string;
  checkout_request_id: string | null;
  merchant_request_id: string | null;
  amount_minor: string;
  status: string;
  observed_at: Date;
}

interface DuplicateReceiptRow {
  mpesa_receipt_number: string;
  duplicate_count: number;
  total_amount_minor: string;
  first_seen_at: Date;
  mpesa_transaction_ids: string[];
  checkout_request_ids: string[];
}

interface UnmatchedLedgerRow {
  transaction_id: string;
  reference: string;
  description: string;
  total_amount_minor: string;
  posted_at: Date;
  account_codes: string[];
}

interface C2bReviewRow {
  c2b_payment_id: string;
  trans_id: string;
  bill_ref_number: string | null;
  amount_minor: string;
  status: string;
  received_at: Date;
  matched_invoice_id: string | null;
  matched_student_id: string | null;
  manual_fee_payment_id: string | null;
  ledger_transaction_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface ActiveMpesaPaymentChannelRow {
  tenant_id: string;
  payment_channel_id: string;
}

interface ReconciliationBatchRow {
  id: string;
}

type FinanceApprovalAction = 'reversal' | 'write_off' | 'move_payment' | 'post_after_mismatch';

interface FinanceApprovalRequestInput {
  action: FinanceApprovalAction;
  subject_type: string;
  subject_id: string;
  amount_minor?: number;
  currency_code?: string;
  reason: string;
  reconciliation_batch_id?: string;
  reconciliation_discrepancy_id?: string;
  evidence?: Record<string, unknown>;
}

interface AccountantReviewListInput {
  reconciliation_state?: string;
  limit?: number;
  offset?: number;
}

const REVIEW_RECONCILIATION_STATES = [
  'verified_unmatched',
  'amount_mismatch',
  'duplicate_provider_receipt',
  'missing_provider_record',
  'reversed',
  'manual_review_required',
] as const;

const FINANCE_APPROVAL_ACTIONS = new Set<FinanceApprovalAction>([
  'reversal',
  'write_off',
  'move_payment',
  'post_after_mismatch',
]);

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 31;

@Injectable()
export class MpesaReconciliationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
    private readonly databaseService: DatabaseService,
    @Optional() private readonly tenantFinanceConfigService?: TenantFinanceConfigService,
  ) {}

  async generateDailyReport(
    input: GenerateMpesaReconciliationReportInput,
  ): Promise<MpesaReconciliationReport> {
    const tenantId = this.requireTenantId();
    const reportDate = this.normalizeReportDate(input.report_date);
    const paymentChannelId = this.normalizeOptionalUuid(
      input.payment_channel_id ?? null,
      'payment_channel_id',
    );
    const { windowStart, windowEnd } = this.buildReportWindow(reportDate);
    const graceMinutes = this.normalizeGraceMinutes(input.missing_callback_grace_minutes);
    const missingCallbackCutoff = new Date(Date.now() - graceMinutes * 60_000);
    const mpesaLedgerAccountCodes = await this.getMpesaLedgerAccountCodes(tenantId);

    const [
      successfulMpesaRows,
      missingCallbackRows,
      duplicateReceiptRows,
      unmatchedLedgerRows,
      c2bReviewRows,
    ] =
      await Promise.all([
        this.loadSuccessfulMpesaRows(tenantId, windowStart, windowEnd, paymentChannelId),
        this.loadMissingCallbackRows(
          tenantId,
          windowStart,
          windowEnd,
          missingCallbackCutoff,
          paymentChannelId,
        ),
        this.loadDuplicateReceiptRows(tenantId, windowStart, windowEnd, paymentChannelId),
        this.loadUnmatchedLedgerRows(
          tenantId,
          windowStart,
          windowEnd,
          mpesaLedgerAccountCodes,
          paymentChannelId,
        ),
        this.loadC2bReviewRows(
          tenantId,
          windowStart,
          windowEnd,
          missingCallbackCutoff,
          paymentChannelId,
        ),
      ]);

    const discrepancies: MpesaReconciliationDiscrepancy[] = [];

    let successfulMpesaAmountMinor = 0n;
    let linkedLedgerAmountMinor = 0n;
    let matchedAmountMinor = 0n;
    let linkedLedgerTransactionCount = 0;
    let matchedTransactionCount = 0;
    let missingLedgerTransactionCount = 0;
    let amountMismatchCount = 0;

    for (const row of successfulMpesaRows) {
      successfulMpesaAmountMinor += this.parseMinorAmount(row.mpesa_amount_minor);

      if (row.linked_transaction_id && row.linked_transaction_amount_minor) {
        linkedLedgerTransactionCount += 1;
        linkedLedgerAmountMinor += this.parseMinorAmount(row.linked_transaction_amount_minor);
      }

      if (!row.ledger_transaction_id || !row.linked_transaction_id) {
        missingLedgerTransactionCount += 1;
        discrepancies.push({
          type: 'missing_ledger_transaction',
          reconciliation_state: 'provider_received',
          severity: 'critical',
          detail: `Successful MPESA transaction "${row.checkout_request_id}" has no linked ledger posting`,
          occurred_at: this.resolveObservedAt(
            row.transaction_occurred_at,
            row.processed_at,
            row.created_at,
          ),
          payment_intent_id: row.payment_intent_id,
          mpesa_transaction_id: row.mpesa_transaction_id,
          ledger_transaction_id: row.ledger_transaction_id,
          checkout_request_id: row.checkout_request_id,
          mpesa_receipt_number: row.mpesa_receipt_number,
          expected_amount_minor: row.mpesa_amount_minor,
          actual_amount_minor: row.linked_transaction_amount_minor,
          metadata: {
            merchant_request_id: row.merchant_request_id,
            reference: row.linked_transaction_reference,
          },
        });
        continue;
      }

      if (
        row.mpesa_amount_minor == null ||
        row.linked_transaction_amount_minor == null ||
        row.mpesa_amount_minor !== row.linked_transaction_amount_minor
      ) {
        amountMismatchCount += 1;
        discrepancies.push({
          type: 'amount_mismatch',
          reconciliation_state: 'amount_mismatch',
          severity: 'critical',
          detail: `MPESA transaction "${row.checkout_request_id}" amount does not match ledger transaction "${row.linked_transaction_id}"`,
          occurred_at: this.resolveObservedAt(
            row.transaction_occurred_at,
            row.linked_transaction_posted_at,
            row.created_at,
          ),
          payment_intent_id: row.payment_intent_id,
          mpesa_transaction_id: row.mpesa_transaction_id,
          ledger_transaction_id: row.linked_transaction_id,
          checkout_request_id: row.checkout_request_id,
          mpesa_receipt_number: row.mpesa_receipt_number,
          expected_amount_minor: row.mpesa_amount_minor,
          actual_amount_minor: row.linked_transaction_amount_minor,
          metadata: {
            merchant_request_id: row.merchant_request_id,
            reference: row.linked_transaction_reference,
          },
        });
        continue;
      }

      matchedTransactionCount += 1;
      matchedAmountMinor += this.parseMinorAmount(row.mpesa_amount_minor);
    }

    for (const row of missingCallbackRows) {
      discrepancies.push({
        type: 'missing_callback',
        reconciliation_state: 'missing_provider_record',
        severity: 'warning',
        detail: `Payment intent "${row.payment_intent_id}" is still awaiting an MPESA callback`,
        occurred_at: row.observed_at.toISOString(),
        payment_intent_id: row.payment_intent_id,
        mpesa_transaction_id: null,
        ledger_transaction_id: null,
        checkout_request_id: row.checkout_request_id,
        mpesa_receipt_number: null,
        expected_amount_minor: row.amount_minor,
        actual_amount_minor: null,
        metadata: {
          merchant_request_id: row.merchant_request_id,
          payment_intent_status: row.status,
        },
      });
    }

    for (const row of duplicateReceiptRows) {
      discrepancies.push({
        type: 'duplicate_mpesa_receipt',
        reconciliation_state: 'duplicate_provider_receipt',
        severity: 'warning',
        detail: `MPESA receipt "${row.mpesa_receipt_number}" appears on ${row.duplicate_count} successful transactions`,
        occurred_at: row.first_seen_at.toISOString(),
        payment_intent_id: null,
        mpesa_transaction_id: row.mpesa_transaction_ids[0] ?? null,
        ledger_transaction_id: null,
        checkout_request_id: row.checkout_request_ids[0] ?? null,
        mpesa_receipt_number: row.mpesa_receipt_number,
        expected_amount_minor: row.total_amount_minor,
        actual_amount_minor: null,
        metadata: {
          duplicate_count: row.duplicate_count,
          mpesa_transaction_ids: row.mpesa_transaction_ids,
          checkout_request_ids: row.checkout_request_ids,
        },
      });
    }

    for (const row of unmatchedLedgerRows) {
      discrepancies.push({
        type: 'unmatched_ledger_transaction',
        reconciliation_state: 'verified_unmatched',
        severity: 'critical',
        detail: `Ledger transaction "${row.reference}" touches MPESA accounts but has no matching MPESA transaction`,
        occurred_at: row.posted_at.toISOString(),
        payment_intent_id: null,
        mpesa_transaction_id: null,
        ledger_transaction_id: row.transaction_id,
        checkout_request_id: null,
        mpesa_receipt_number: null,
        expected_amount_minor: null,
        actual_amount_minor: row.total_amount_minor,
        metadata: {
          description: row.description,
          account_codes: row.account_codes,
        },
      });
    }

    let manualReviewRequiredCount = 0;

    for (const row of c2bReviewRows) {
      const state = this.resolveC2bReconciliationState(row.status);

      if (state === 'manual_review_required') {
        manualReviewRequiredCount += 1;
      }

      discrepancies.push({
        type: state === 'amount_mismatch'
          ? 'amount_mismatch'
          : state === 'missing_provider_record'
            ? 'missing_provider_record'
            : 'manual_review_required',
        reconciliation_state: state,
        severity: state === 'verified_unmatched' ? 'warning' : 'critical',
        detail: `M-PESA C2B payment "${row.trans_id}" requires accountant reconciliation review with state "${state}"`,
        occurred_at: row.received_at.toISOString(),
        payment_intent_id: null,
        mpesa_transaction_id: null,
        ledger_transaction_id: row.ledger_transaction_id,
        checkout_request_id: null,
        mpesa_receipt_number: row.trans_id,
        expected_amount_minor: row.amount_minor,
        actual_amount_minor: null,
        metadata: {
          c2b_payment_id: row.c2b_payment_id,
          bill_ref_number: row.bill_ref_number,
          matched_invoice_id: row.matched_invoice_id,
          matched_student_id: row.matched_student_id,
          manual_fee_payment_id: row.manual_fee_payment_id,
          provider_status: row.status,
          ...(row.metadata ?? {}),
        },
      });
    }

    discrepancies.sort((left, right) => {
      if (left.occurred_at === right.occurred_at) {
        return left.type.localeCompare(right.type);
      }

      return left.occurred_at.localeCompare(right.occurred_at);
    });

    const summary: MpesaReconciliationSummary = {
      successful_mpesa_transaction_count: successfulMpesaRows.length,
      successful_mpesa_amount_minor: successfulMpesaAmountMinor.toString(),
      linked_ledger_transaction_count: linkedLedgerTransactionCount,
      linked_ledger_amount_minor: linkedLedgerAmountMinor.toString(),
      matched_transaction_count: matchedTransactionCount,
      matched_amount_minor: matchedAmountMinor.toString(),
      missing_callback_count: missingCallbackRows.length,
      missing_ledger_transaction_count: missingLedgerTransactionCount,
      amount_mismatch_count: amountMismatchCount,
      duplicate_receipt_group_count: duplicateReceiptRows.length,
      unmatched_ledger_transaction_count: unmatchedLedgerRows.length,
      manual_review_required_count: manualReviewRequiredCount,
      discrepancy_count: discrepancies.length,
    };

    const report: MpesaReconciliationReport = {
      reconciliation_batch_id: null,
      tenant_id: tenantId,
      payment_channel_id: paymentChannelId,
      report_date: reportDate,
      generated_at: new Date().toISOString(),
      window_started_at: windowStart.toISOString(),
      window_ended_at: windowEnd.toISOString(),
      is_balanced: discrepancies.length === 0,
      summary,
      discrepancies,
    };

    if (input.persist_batch === false) {
      return report;
    }

    return {
      ...report,
      reconciliation_batch_id: await this.persistReconciliationBatch(report),
    };
  }

  async generateDateRangeReport(
    input: GenerateMpesaReconciliationRangeReportInput,
  ): Promise<MpesaReconciliationRangeReport> {
    const tenantId = this.requireTenantId();
    const startDate = this.normalizeReportDate(input.start_date);
    const endDate = this.normalizeReportDate(input.end_date);
    const dates = this.enumerateReportDates(startDate, endDate);
    const reports: MpesaReconciliationReport[] = [];

    for (const reportDate of dates) {
      reports.push(
        await this.generateDailyReport({
          report_date: reportDate,
          missing_callback_grace_minutes: input.missing_callback_grace_minutes,
          payment_channel_id: input.payment_channel_id,
          persist_batch: input.persist_batch,
        }),
      );
    }

    return {
      tenant_id: tenantId,
      payment_channel_id: this.normalizeOptionalUuid(
        input.payment_channel_id ?? null,
        'payment_channel_id',
      ),
      start_date: startDate,
      end_date: endDate,
      generated_at: new Date().toISOString(),
      report_count: reports.length,
      is_balanced: reports.every((report) => report.is_balanced),
      summary: this.aggregateSummaries(reports.map((report) => report.summary)),
      reports,
    };
  }

  async runDailyProcessor(input: {
    report_date?: string;
    missing_callback_grace_minutes?: number;
    now?: string;
  } = {}): Promise<MpesaReconciliationProcessorResult> {
    const reportDate = input.report_date
      ? this.normalizeReportDate(input.report_date)
      : this.resolvePreviousNairobiDate(input.now ? new Date(input.now) : new Date());
    const channels = await this.loadActiveMpesaPaymentChannels();
    const reports: MpesaReconciliationReport[] = [];

    for (const channel of channels) {
      reports.push(
        await this.requestContext.run(
          {
            request_id: `mpesa-reconciliation:${channel.tenant_id}:${channel.payment_channel_id}:${reportDate}`,
            tenant_id: channel.tenant_id,
            user_id: 'system',
            role: 'system',
            session_id: null,
            permissions: ['billing:read'],
            is_authenticated: true,
            client_ip: '127.0.0.1',
            user_agent: 'mpesa-reconciliation-processor',
            method: 'WORKER',
            path: '/workers/mpesa/reconciliation/daily',
            started_at: new Date().toISOString(),
          },
          () =>
            this.generateDailyReport({
              report_date: reportDate,
              missing_callback_grace_minutes: input.missing_callback_grace_minutes,
              payment_channel_id: channel.payment_channel_id,
            }),
        ),
      );
    }

    return {
      report_date: reportDate,
      generated_at: new Date().toISOString(),
      processed_channel_count: channels.length,
      is_balanced: reports.every((report) => report.is_balanced),
      reports,
    };
  }

  async listAccountantReviewItems(input: AccountantReviewListInput = {}) {
    const tenantId = this.requireTenantId();
    const state = input.reconciliation_state
      ? this.normalizeReviewState(input.reconciliation_state)
      : null;
    const limit = this.normalizeReviewLimit(input.limit);
    const offset = this.normalizeReviewOffset(input.offset);
    const result = await this.databaseService.query<Record<string, unknown>>(
      `
        SELECT
          id::text,
          reconciliation_batch_id::text,
          discrepancy_type,
          reconciliation_state,
          severity,
          detail,
          occurred_at,
          provider_transaction_id,
          payment_intent_id::text,
          mpesa_transaction_id::text,
          fee_invoice_id::text,
          ledger_transaction_id::text,
          approving_user_id::text,
          resolution_status,
          evidence - 'raw_payload' AS evidence,
          created_at
        FROM mpesa_reconciliation_discrepancies
        WHERE tenant_id = $1
          AND resolution_status IN ('open', 'under_review')
          AND reconciliation_state = ANY($2::text[])
          AND ($3::text IS NULL OR reconciliation_state = $3)
        ORDER BY
          CASE severity WHEN 'critical' THEN 0 ELSE 1 END,
          occurred_at DESC,
          id DESC
        LIMIT $4::integer
        OFFSET $5::integer
      `,
      [
        tenantId,
        REVIEW_RECONCILIATION_STATES,
        state,
        limit,
        offset,
      ],
    );
    const items: Array<Record<string, unknown>> = result.rows.map((row) => ({
      ...row,
      evidence: redactReviewEvidence(row.evidence),
    }));
    const summary = items.reduce<Record<string, number>>(
      (counts, row) => {
        const reconciliationState = String(row.reconciliation_state ?? 'unknown');
        counts.open_count += 1;
        counts[reconciliationState] = (counts[reconciliationState] ?? 0) + 1;
        return counts;
      },
      { open_count: 0 },
    );

    return {
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      summary,
      items,
    };
  }

  async requestFinanceApproval(input: FinanceApprovalRequestInput) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const action = this.normalizeFinanceApprovalAction(input.action);
    const reason = this.requireText(input.reason, 'Finance approval reason');
    const subjectType = this.requireText(input.subject_type, 'Finance approval subject type');
    const subjectId = this.normalizeOptionalUuid(input.subject_id, 'subject_id');
    const amountMinor = this.normalizeOptionalPositiveInteger(input.amount_minor, 'amount_minor');
    const currencyCode = this.normalizeCurrencyCode(input.currency_code ?? 'KES');
    const reconciliationBatchId = this.normalizeOptionalUuid(
      input.reconciliation_batch_id ?? null,
      'reconciliation_batch_id',
    );
    const reconciliationDiscrepancyId = this.normalizeOptionalUuid(
      input.reconciliation_discrepancy_id ?? null,
      'reconciliation_discrepancy_id',
    );

    if (!subjectId) {
      throw new BadRequestException('Finance approval subject_id is required');
    }

    const result = await this.databaseService.query<Record<string, unknown>>(
      `
        INSERT INTO finance_approval_requests (
          tenant_id,
          action,
          subject_type,
          subject_id,
          amount_minor,
          currency_code,
          reason,
          reconciliation_batch_id,
          reconciliation_discrepancy_id,
          requested_by_user_id,
          evidence
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::uuid,
          $5::bigint,
          $6,
          $7,
          $8::uuid,
          $9::uuid,
          $10::uuid,
          $11::jsonb
        )
        RETURNING *
      `,
      [
        tenantId,
        action,
        subjectType,
        subjectId,
        amountMinor,
        currencyCode,
        reason,
        reconciliationBatchId,
        reconciliationDiscrepancyId,
        actorUserId,
        JSON.stringify(redactReviewEvidence(input.evidence ?? {})),
      ],
    );
    const request = result.rows[0];

    if (!request) {
      throw new BadRequestException('Finance approval request could not be created');
    }

    return request;
  }

  async approveFinanceApproval(requestId: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const approvalRequestId = this.normalizeOptionalUuid(requestId, 'approval_request_id');

    if (!approvalRequestId) {
      throw new BadRequestException('Finance approval request id is required');
    }

    const approval = await this.loadFinanceApprovalRequest(tenantId, approvalRequestId);

    if (!approval) {
      throw new NotFoundException('Finance approval request was not found');
    }

    if (String(approval.requested_by_user_id ?? '') === actorUserId) {
      throw new ForbiddenException('Finance approval requester cannot approve their own request');
    }

    if (approval.status === 'pending_first_approval') {
      return this.recordFirstFinanceApproval(tenantId, approvalRequestId, actorUserId);
    }

    if (approval.status === 'pending_second_approval') {
      if (String(approval.first_approver_user_id ?? '') === actorUserId) {
        throw new ForbiddenException('Finance approval requires a distinct approver for second approval');
      }

      const approved = await this.recordSecondFinanceApproval(tenantId, approvalRequestId, actorUserId);
      await this.resolveFinanceApprovalSubject(tenantId, approved, actorUserId);
      return approved;
    }

    throw new BadRequestException(`Finance approval request is not pending approval; current status is "${approval.status}"`);
  }

  private async loadSuccessfulMpesaRows(
    tenantId: string,
    windowStart: Date,
    windowEnd: Date,
    paymentChannelId: string | null,
  ): Promise<SuccessfulMpesaRow[]> {
    const result = await this.databaseService.query<SuccessfulMpesaRow>(
      `
        SELECT
          mt.id AS mpesa_transaction_id,
          mt.payment_intent_id,
          mt.checkout_request_id,
          mt.merchant_request_id,
          mt.mpesa_receipt_number,
          mt.amount_minor::text AS mpesa_amount_minor,
          mt.ledger_transaction_id,
          mt.transaction_occurred_at,
          mt.processed_at,
          mt.created_at,
          t.id AS linked_transaction_id,
          t.reference AS linked_transaction_reference,
          t.total_amount_minor::text AS linked_transaction_amount_minor,
          t.posted_at AS linked_transaction_posted_at
        FROM mpesa_transactions mt
        INNER JOIN payment_intents pi
          ON pi.tenant_id = mt.tenant_id
         AND pi.id = mt.payment_intent_id
        LEFT JOIN transactions t
          ON t.tenant_id = mt.tenant_id
         AND t.id = mt.ledger_transaction_id
        WHERE mt.tenant_id = $1
          AND mt.status = 'succeeded'
          AND COALESCE(mt.transaction_occurred_at, mt.processed_at, mt.created_at) >= $2::timestamptz
          AND COALESCE(mt.transaction_occurred_at, mt.processed_at, mt.created_at) < $3::timestamptz
          AND ($4::uuid IS NULL OR pi.payment_channel_id = $4::uuid)
        ORDER BY COALESCE(mt.transaction_occurred_at, mt.processed_at, mt.created_at) ASC, mt.id ASC
      `,
      [tenantId, windowStart.toISOString(), windowEnd.toISOString(), paymentChannelId],
    );

    return result.rows;
  }

  private async loadMissingCallbackRows(
    tenantId: string,
    windowStart: Date,
    windowEnd: Date,
    cutoff: Date,
    paymentChannelId: string | null,
  ): Promise<MissingCallbackRow[]> {
    const result = await this.databaseService.query<MissingCallbackRow>(
      `
        SELECT
          pi.id AS payment_intent_id,
          pi.checkout_request_id,
          pi.merchant_request_id,
          pi.amount_minor::text AS amount_minor,
          pi.status,
          COALESCE(pi.stk_requested_at, pi.created_at) AS observed_at
        FROM payment_intents pi
        LEFT JOIN mpesa_transactions mt
          ON mt.tenant_id = pi.tenant_id
         AND mt.payment_intent_id = pi.id
        WHERE pi.tenant_id = $1
          AND pi.status IN ('stk_requested', 'callback_received', 'processing')
          AND pi.checkout_request_id IS NOT NULL
          AND mt.id IS NULL
          AND COALESCE(pi.stk_requested_at, pi.created_at) >= $2::timestamptz
          AND COALESCE(pi.stk_requested_at, pi.created_at) < $3::timestamptz
          AND COALESCE(pi.stk_requested_at, pi.created_at) <= $4::timestamptz
          AND ($5::uuid IS NULL OR pi.payment_channel_id = $5::uuid)
        ORDER BY observed_at ASC, pi.id ASC
      `,
      [
        tenantId,
        windowStart.toISOString(),
        windowEnd.toISOString(),
        cutoff.toISOString(),
        paymentChannelId,
      ],
    );

    return result.rows;
  }

  private async loadDuplicateReceiptRows(
    tenantId: string,
    windowStart: Date,
    windowEnd: Date,
    paymentChannelId: string | null,
  ): Promise<DuplicateReceiptRow[]> {
    const result = await this.databaseService.query<DuplicateReceiptRow>(
      `
        SELECT
          mt.mpesa_receipt_number,
          COUNT(*)::integer AS duplicate_count,
          COALESCE(SUM(mt.amount_minor), 0)::text AS total_amount_minor,
          MIN(COALESCE(mt.transaction_occurred_at, mt.processed_at, mt.created_at)) AS first_seen_at,
          ARRAY_AGG(mt.id::text ORDER BY COALESCE(mt.transaction_occurred_at, mt.processed_at, mt.created_at), mt.id) AS mpesa_transaction_ids,
          ARRAY_AGG(mt.checkout_request_id ORDER BY COALESCE(mt.transaction_occurred_at, mt.processed_at, mt.created_at), mt.id) AS checkout_request_ids
        FROM mpesa_transactions mt
        INNER JOIN payment_intents pi
          ON pi.tenant_id = mt.tenant_id
         AND pi.id = mt.payment_intent_id
        WHERE mt.tenant_id = $1
          AND mt.status = 'succeeded'
          AND mt.mpesa_receipt_number IS NOT NULL
          AND COALESCE(mt.transaction_occurred_at, mt.processed_at, mt.created_at) >= $2::timestamptz
          AND COALESCE(mt.transaction_occurred_at, mt.processed_at, mt.created_at) < $3::timestamptz
          AND ($4::uuid IS NULL OR pi.payment_channel_id = $4::uuid)
        GROUP BY mt.mpesa_receipt_number
        HAVING COUNT(*) > 1
        ORDER BY first_seen_at ASC, mt.mpesa_receipt_number ASC
      `,
      [tenantId, windowStart.toISOString(), windowEnd.toISOString(), paymentChannelId],
    );

    return result.rows;
  }

  private async loadUnmatchedLedgerRows(
    tenantId: string,
    windowStart: Date,
    windowEnd: Date,
    mpesaLedgerAccountCodes: string[],
    paymentChannelId: string | null,
  ): Promise<UnmatchedLedgerRow[]> {
    const result = await this.databaseService.query<UnmatchedLedgerRow>(
      `
        WITH mpesa_accounts AS (
          SELECT id, code
          FROM accounts
          WHERE tenant_id = $1
            AND code = ANY($4::text[])
        ),
        candidate_transactions AS (
          SELECT DISTINCT
            t.id AS transaction_id,
            t.reference,
            t.description,
            t.total_amount_minor::text AS total_amount_minor,
            t.posted_at
          FROM transactions t
          JOIN ledger_entries le
            ON le.tenant_id = t.tenant_id
           AND le.transaction_id = t.id
          JOIN mpesa_accounts ma
            ON ma.id = le.account_id
          WHERE t.tenant_id = $1
            AND t.posted_at >= $2::timestamptz
            AND t.posted_at < $3::timestamptz
            AND ($5::uuid IS NULL OR t.metadata ->> 'payment_channel_id' = $5::text)
        )
        SELECT
          ct.transaction_id,
          ct.reference,
          ct.description,
          ct.total_amount_minor,
          ct.posted_at,
          ARRAY_AGG(DISTINCT ma.code ORDER BY ma.code) AS account_codes
        FROM candidate_transactions ct
        JOIN ledger_entries le
          ON le.tenant_id = $1
         AND le.transaction_id = ct.transaction_id
        JOIN mpesa_accounts ma
          ON ma.id = le.account_id
        LEFT JOIN mpesa_transactions mt
          ON mt.tenant_id = $1
         AND mt.ledger_transaction_id = ct.transaction_id
         AND mt.status = 'succeeded'
        WHERE mt.id IS NULL
        GROUP BY
          ct.transaction_id,
          ct.reference,
          ct.description,
          ct.total_amount_minor,
          ct.posted_at
        ORDER BY ct.posted_at ASC, ct.transaction_id ASC
      `,
      [
        tenantId,
        windowStart.toISOString(),
        windowEnd.toISOString(),
        mpesaLedgerAccountCodes,
        paymentChannelId,
      ],
    );

    return result.rows;
  }

  private async loadC2bReviewRows(
    tenantId: string,
    windowStart: Date,
    windowEnd: Date,
    cutoff: Date,
    paymentChannelId: string | null,
  ): Promise<C2bReviewRow[]> {
    const result = await this.databaseService.query<C2bReviewRow>(
      `
        SELECT
          c2b.id AS c2b_payment_id,
          c2b.trans_id,
          c2b.bill_ref_number,
          c2b.amount_minor::text AS amount_minor,
          c2b.status,
          c2b.received_at,
          c2b.matched_invoice_id,
          c2b.matched_student_id,
          c2b.manual_fee_payment_id,
          c2b.ledger_transaction_id,
          c2b.metadata
        FROM mpesa_c2b_payments c2b
        WHERE c2b.tenant_id = $1
          AND c2b.received_at >= $2::timestamptz
          AND c2b.received_at < $3::timestamptz
          AND ($4::uuid IS NULL OR c2b.payment_channel_id = $4::uuid)
          AND (
            c2b.status IN (
              'verified_unmatched',
              'amount_mismatch',
              'duplicate_provider_receipt',
              'missing_provider_record',
              'reversed',
              'manual_review_required'
            )
            OR (
              c2b.status IN ('received_unverified', 'verification_requested')
              AND c2b.received_at <= $5::timestamptz
            )
          )
        ORDER BY c2b.received_at ASC, c2b.id ASC
      `,
      [
        tenantId,
        windowStart.toISOString(),
        windowEnd.toISOString(),
        paymentChannelId,
        cutoff.toISOString(),
      ],
    );

    return result.rows;
  }

  private async loadActiveMpesaPaymentChannels(): Promise<ActiveMpesaPaymentChannelRow[]> {
    const result = await this.databaseService.query<ActiveMpesaPaymentChannelRow>(
      `
        SELECT
          tpc.tenant_id,
          tpc.id AS payment_channel_id
        FROM tenant_payment_channels tpc
        INNER JOIN tenant_mpesa_configs tmc
          ON tmc.tenant_id = tpc.tenant_id
         AND tmc.id = tpc.mpesa_config_id
        WHERE tpc.status = 'active'
          AND tpc.channel_type IN ('mpesa_paybill', 'mpesa_till')
          AND tmc.status = 'active'
        ORDER BY tpc.tenant_id ASC, tpc.id ASC
      `,
      [],
    );

    return result.rows;
  }

  private async persistReconciliationBatch(report: MpesaReconciliationReport): Promise<string> {
    const store = this.requestContext.getStore();
    const batchResult = await this.databaseService.query<ReconciliationBatchRow>(
      `
        INSERT INTO mpesa_reconciliation_batches (
          tenant_id,
          payment_channel_id,
          report_date,
          window_started_at,
          window_ended_at,
          reconciliation_state,
          summary,
          discrepancy_count,
          generated_by_user_id,
          generated_at
        )
        VALUES (
          $1,
          $2::uuid,
          $3::date,
          $4::timestamptz,
          $5::timestamptz,
          $6,
          $7::jsonb,
          $8::integer,
          $9::uuid,
          $10::timestamptz
        )
        RETURNING id
      `,
      [
        report.tenant_id,
        report.payment_channel_id,
        report.report_date,
        report.window_started_at,
        report.window_ended_at,
        report.is_balanced ? 'verified_matched' : 'manual_review_required',
        JSON.stringify(report.summary),
        report.discrepancies.length,
        this.parseNullableUuid(store?.user_id ?? null),
        report.generated_at,
      ],
    );
    const batchId = batchResult.rows[0]?.id;

    if (!batchId) {
      throw new BadRequestException('MPESA reconciliation batch could not be recorded');
    }

    for (const discrepancy of report.discrepancies) {
      await this.databaseService.query(
        `
          INSERT INTO mpesa_reconciliation_discrepancies (
            tenant_id,
            reconciliation_batch_id,
            discrepancy_type,
            reconciliation_state,
            severity,
            detail,
            occurred_at,
            provider_transaction_id,
            payment_intent_id,
            mpesa_transaction_id,
            fee_invoice_id,
            ledger_transaction_id,
            approving_user_id,
            evidence
          )
          VALUES (
            $1,
            $2::uuid,
            $3,
            $4,
            $5,
            $6,
            $7::timestamptz,
            $8,
            $9::uuid,
            $10::uuid,
            $11::uuid,
            $12::uuid,
            $13::uuid,
            $14::jsonb
          )
        `,
        [
          report.tenant_id,
          batchId,
          discrepancy.type,
          discrepancy.reconciliation_state,
          discrepancy.severity,
          discrepancy.detail,
          discrepancy.occurred_at,
          discrepancy.mpesa_receipt_number ?? discrepancy.checkout_request_id,
          this.parseNullableUuid(discrepancy.payment_intent_id),
          this.parseNullableUuid(discrepancy.mpesa_transaction_id),
          this.parseNullableUuid(discrepancy.metadata.matched_invoice_id),
          this.parseNullableUuid(discrepancy.ledger_transaction_id),
          this.parseNullableUuid(discrepancy.metadata.approving_user_id),
          JSON.stringify({
            checkout_request_id: discrepancy.checkout_request_id,
            expected_amount_minor: discrepancy.expected_amount_minor,
            actual_amount_minor: discrepancy.actual_amount_minor,
            metadata: discrepancy.metadata,
          }),
        ],
      );
    }

    return batchId;
  }

  private async loadFinanceApprovalRequest(tenantId: string, requestId: string) {
    const result = await this.databaseService.query<Record<string, unknown>>(
      `
        SELECT
          id::text,
          tenant_id,
          action,
          status,
          subject_type,
          subject_id::text,
          amount_minor::text,
          currency_code,
          reason,
          reconciliation_batch_id::text,
          reconciliation_discrepancy_id::text,
          close_period_id::text,
          requested_by_user_id::text,
          first_approver_user_id::text,
          first_approved_at::text,
          second_approver_user_id::text,
          second_approved_at::text,
          rejected_by_user_id::text,
          rejected_at::text,
          evidence,
          created_at::text,
          updated_at::text
        FROM finance_approval_requests
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
        FOR UPDATE
      `,
      [tenantId, requestId],
    );

    return result.rows[0] ?? null;
  }

  private async recordFirstFinanceApproval(
    tenantId: string,
    requestId: string,
    actorUserId: string,
  ) {
    const result = await this.databaseService.query<Record<string, unknown>>(
      `
        UPDATE finance_approval_requests
        SET
          status = 'pending_second_approval',
          first_approver_user_id = $3::uuid,
          first_approved_at = NOW(),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = 'pending_first_approval'
        RETURNING
          id::text,
          tenant_id,
          action,
          status,
          subject_type,
          subject_id::text,
          amount_minor::text,
          currency_code,
          reason,
          reconciliation_batch_id::text,
          reconciliation_discrepancy_id::text,
          close_period_id::text,
          requested_by_user_id::text,
          first_approver_user_id::text,
          first_approved_at::text,
          second_approver_user_id::text,
          second_approved_at::text,
          rejected_by_user_id::text,
          rejected_at::text,
          evidence,
          created_at::text,
          updated_at::text
      `,
      [tenantId, requestId, actorUserId],
    );

    return result.rows[0] ?? await this.loadFinanceApprovalRequest(tenantId, requestId);
  }

  private async recordSecondFinanceApproval(
    tenantId: string,
    requestId: string,
    actorUserId: string,
  ) {
    const result = await this.databaseService.query<Record<string, unknown>>(
      `
        UPDATE finance_approval_requests
        SET
          status = 'approved',
          second_approver_user_id = $3::uuid,
          second_approved_at = NOW(),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = 'pending_second_approval'
        RETURNING
          id::text,
          tenant_id,
          action,
          status,
          subject_type,
          subject_id::text,
          amount_minor::text,
          currency_code,
          reason,
          reconciliation_batch_id::text,
          reconciliation_discrepancy_id::text,
          close_period_id::text,
          requested_by_user_id::text,
          first_approver_user_id::text,
          first_approved_at::text,
          second_approver_user_id::text,
          second_approved_at::text,
          rejected_by_user_id::text,
          rejected_at::text,
          evidence,
          created_at::text,
          updated_at::text
      `,
      [tenantId, requestId, actorUserId],
    );

    return result.rows[0] ?? await this.loadFinanceApprovalRequest(tenantId, requestId);
  }

  private async resolveFinanceApprovalSubject(
    tenantId: string,
    approval: Record<string, unknown> | null,
    actorUserId: string,
  ): Promise<void> {
    if (!approval || approval.status !== 'approved') {
      return;
    }

    const reconciliationDiscrepancyId = this.parseNullableUuid(approval.reconciliation_discrepancy_id);

    if (!reconciliationDiscrepancyId) {
      return;
    }

    await this.databaseService.query(
      `
        UPDATE mpesa_reconciliation_discrepancies
        SET
          resolution_status = 'resolved',
          resolved_by_user_id = $3::uuid,
          resolved_at = NOW(),
          approving_user_id = $3::uuid,
          evidence = evidence || jsonb_build_object(
            'finance_approval_request_id', $2::text,
            'finance_approval_action', $4::text,
            'finance_approval_status', 'approved'
          ),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $5::uuid
      `,
      [
        tenantId,
        approval.id,
        actorUserId,
        approval.action,
        reconciliationDiscrepancyId,
      ],
    );
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for MPESA reconciliation');
    }

    return tenantId;
  }

  private requireUserId(): string {
    const userId = this.requestContext.requireStore().user_id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user context is required for MPESA reconciliation');
    }

    return userId;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private normalizeReviewState(value: string): string {
    const normalized = value.trim();

    if (!REVIEW_RECONCILIATION_STATES.includes(normalized as never)) {
      throw new BadRequestException('Unsupported MPESA reconciliation review state');
    }

    return normalized;
  }

  private normalizeReviewLimit(value: number | undefined): number {
    if (value == null) {
      return 25;
    }

    if (!Number.isInteger(value) || value < 1) {
      throw new BadRequestException('MPESA reconciliation review limit must be a positive integer');
    }

    return Math.min(value, 50);
  }

  private normalizeReviewOffset(value: number | undefined): number {
    if (value == null) {
      return 0;
    }

    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException('MPESA reconciliation review offset must be zero or greater');
    }

    return value;
  }

  private normalizeFinanceApprovalAction(value: string): FinanceApprovalAction {
    const normalized = value?.trim() as FinanceApprovalAction;

    if (!FINANCE_APPROVAL_ACTIONS.has(normalized)) {
      throw new BadRequestException('Unsupported finance approval action');
    }

    return normalized;
  }

  private normalizeOptionalPositiveInteger(value: number | undefined, fieldName: string): number | null {
    if (value == null) {
      return null;
    }

    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`MPESA reconciliation ${fieldName} must be a positive integer`);
    }

    return value;
  }

  private normalizeCurrencyCode(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new BadRequestException('Finance approval currency_code must be a three-letter ISO currency');
    }

    return normalized;
  }

  private normalizeReportDate(value: string): string {
    const normalizedValue = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
      throw new BadRequestException(
        'MPESA reconciliation report_date must use the YYYY-MM-DD format',
      );
    }

    const [year, month, day] = normalizedValue.split('-').map((part) => Number(part));
    const validationDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    if (
      Number.isNaN(validationDate.getTime()) ||
      validationDate.getUTCFullYear() !== year ||
      validationDate.getUTCMonth() !== month - 1 ||
      validationDate.getUTCDate() !== day
    ) {
      throw new BadRequestException(
        `MPESA reconciliation report_date "${normalizedValue}" is invalid`,
      );
    }

    return normalizedValue;
  }

  private normalizeOptionalUuid(value: string | null, fieldName: string): string | null {
    if (value == null || value === '') {
      return null;
    }

    const normalizedValue = value.trim();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedValue)) {
      throw new BadRequestException(`MPESA reconciliation ${fieldName} must be a UUID`);
    }

    return normalizedValue;
  }

  private normalizeGraceMinutes(value: number | undefined): number {
    if (value == null) {
      return 15;
    }

    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(
        'MPESA reconciliation missing_callback_grace_minutes must be a non-negative integer',
      );
    }

    return value;
  }

  private buildReportWindow(reportDate: string): { windowStart: Date; windowEnd: Date } {
    const windowStart = new Date(`${reportDate}T00:00:00+03:00`);

    if (Number.isNaN(windowStart.getTime())) {
      throw new BadRequestException(
        `MPESA reconciliation report_date "${reportDate}" could not be parsed`,
      );
    }

    return {
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  private enumerateReportDates(startDate: string, endDate: string): string[] {
    const start = this.reportDateToUtcDay(startDate);
    const end = this.reportDateToUtcDay(endDate);

    if (end.getTime() < start.getTime()) {
      throw new BadRequestException('MPESA reconciliation end_date must be on or after start_date');
    }

    const dayCount = Math.floor((end.getTime() - start.getTime()) / ONE_DAY_MS) + 1;

    if (dayCount > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `MPESA reconciliation date ranges cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }

    return Array.from({ length: dayCount }, (_, index) =>
      new Date(start.getTime() + index * ONE_DAY_MS).toISOString().slice(0, 10),
    );
  }

  private reportDateToUtcDay(reportDate: string): Date {
    const [year, month, day] = reportDate.split('-').map((part) => Number(part));
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  private aggregateSummaries(summaries: MpesaReconciliationSummary[]): MpesaReconciliationSummary {
    return summaries.reduce<MpesaReconciliationSummary>(
      (total, summary) => ({
        successful_mpesa_transaction_count:
          total.successful_mpesa_transaction_count + summary.successful_mpesa_transaction_count,
        successful_mpesa_amount_minor: (
          BigInt(total.successful_mpesa_amount_minor) +
          BigInt(summary.successful_mpesa_amount_minor)
        ).toString(),
        linked_ledger_transaction_count:
          total.linked_ledger_transaction_count + summary.linked_ledger_transaction_count,
        linked_ledger_amount_minor: (
          BigInt(total.linked_ledger_amount_minor) + BigInt(summary.linked_ledger_amount_minor)
        ).toString(),
        matched_transaction_count:
          total.matched_transaction_count + summary.matched_transaction_count,
        matched_amount_minor: (
          BigInt(total.matched_amount_minor) + BigInt(summary.matched_amount_minor)
        ).toString(),
        missing_callback_count: total.missing_callback_count + summary.missing_callback_count,
        missing_ledger_transaction_count:
          total.missing_ledger_transaction_count + summary.missing_ledger_transaction_count,
        amount_mismatch_count: total.amount_mismatch_count + summary.amount_mismatch_count,
        duplicate_receipt_group_count:
          total.duplicate_receipt_group_count + summary.duplicate_receipt_group_count,
        unmatched_ledger_transaction_count:
          total.unmatched_ledger_transaction_count + summary.unmatched_ledger_transaction_count,
        manual_review_required_count:
          total.manual_review_required_count + summary.manual_review_required_count,
        discrepancy_count: total.discrepancy_count + summary.discrepancy_count,
      }),
      this.emptySummary(),
    );
  }

  private emptySummary(): MpesaReconciliationSummary {
    return {
      successful_mpesa_transaction_count: 0,
      successful_mpesa_amount_minor: '0',
      linked_ledger_transaction_count: 0,
      linked_ledger_amount_minor: '0',
      matched_transaction_count: 0,
      matched_amount_minor: '0',
      missing_callback_count: 0,
      missing_ledger_transaction_count: 0,
      amount_mismatch_count: 0,
      duplicate_receipt_group_count: 0,
      unmatched_ledger_transaction_count: 0,
      manual_review_required_count: 0,
      discrepancy_count: 0,
    };
  }

  private resolvePreviousNairobiDate(now: Date): string {
    if (Number.isNaN(now.getTime())) {
      throw new BadRequestException('MPESA reconciliation processor now value must be a valid ISO timestamp');
    }

    const nairobiDate = new Date(now.getTime() + NAIROBI_OFFSET_MS - ONE_DAY_MS);
    return nairobiDate.toISOString().slice(0, 10);
  }

  private resolveC2bReconciliationState(status: string):
    | 'verified_unmatched'
    | 'amount_mismatch'
    | 'duplicate_provider_receipt'
    | 'missing_provider_record'
    | 'reversed'
    | 'manual_review_required' {
    if (
      status === 'verified_unmatched' ||
      status === 'amount_mismatch' ||
      status === 'duplicate_provider_receipt' ||
      status === 'missing_provider_record' ||
      status === 'reversed'
    ) {
      return status;
    }

    return 'manual_review_required';
  }

  private async getMpesaLedgerAccountCodes(tenantId: string): Promise<string[]> {
    if (this.tenantFinanceConfigService) {
      try {
        const config = await this.tenantFinanceConfigService.resolveMpesaConfigForTenant(tenantId);

        return [config.ledger_debit_account_code, config.ledger_credit_account_code];
      } catch {
        // Fall back to legacy configured codes so reconciliation remains available during migration.
      }
    }

    return [
      this.configService.get<string>('mpesa.ledgerDebitAccountCode') ?? '1100-MPESA-CLEARING',
      this.configService.get<string>('mpesa.ledgerCreditAccountCode') ??
        '2100-CUSTOMER-DEPOSITS',
    ];
  }

  private parseMinorAmount(value: string | null): bigint {
    if (!value) {
      return 0n;
    }

    return BigInt(value);
  }

  private parseNullableUuid(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
      ? value
      : null;
  }

  private resolveObservedAt(...values: Array<Date | null | undefined>): string {
    const observedAt = values.find(
      (value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()),
    );

    return (observedAt ?? new Date()).toISOString();
  }
}

function redactReviewEvidence(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactReviewEvidence(item));
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (/^(raw_payload|raw_body|raw_callback|callback_body|provider_response)$/i.test(key)) {
      continue;
    }

    redacted[key] = redactReviewEvidence(entry);
  }

  return redacted;
}
