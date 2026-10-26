import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { FinanceCorrectionService } from '../finance-correction.service';
import { SchoolOperationalEventsService } from '../../events/school-operational-events.service';
import { AuditLogService } from '../../observability/audit-log.service';

import { RequestContextService } from '../../../common/request-context/request-context.service';
import { PrismaService } from '../../../database/prisma.service';
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
  request_key?:string;
  target_student_id?: string;
  action: FinanceApprovalAction;
  subject_type: string;
  subject_id: string;
  amount_minor?: number | string;
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

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    @Optional() private readonly tenantFinanceConfigService?: TenantFinanceConfigService,
    @Optional() private readonly corrections?: FinanceCorrectionService,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
    @Optional() private readonly audit?: AuditLogService,
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
    const result = await this.executeSql<Record<string, unknown>>(
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
          COALESCE((SELECT amount_minor::text FROM collection_payments p WHERE p.tenant_id=mpesa_reconciliation_discrepancies.tenant_id
            AND p.provider_code='safaricom' AND p.provider_transaction_id=mpesa_reconciliation_discrepancies.provider_transaction_id AND p.status='posted'),
            (SELECT p.amount_minor::text FROM payment_intents p WHERE p.tenant_id=mpesa_reconciliation_discrepancies.tenant_id
              AND p.id=mpesa_reconciliation_discrepancies.payment_intent_id AND p.payment_owner='tenant' AND p.status='completed'
              AND p.student_id IS NOT NULL AND p.ledger_transaction_id IS NOT NULL
              AND NOT EXISTS(SELECT 1 FROM student_fee_payment_reversals r WHERE r.tenant_id=p.tenant_id AND r.payment_intent_id=p.id)
              AND NOT EXISTS(SELECT 1 FROM manual_fee_payments m WHERE m.tenant_id=p.tenant_id AND m.ledger_transaction_id::text=p.ledger_transaction_id::text))) AS collection_amount_minor,
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

  async listFinanceApprovals(limit=50,offset=0) {
    this.requireFinanceActor(true);
    if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0) throw new BadRequestException('Invalid review page');
    const actor=this.requestContext.requireStore();
    const rows=(await this.executeSql(`SELECT id::text,action,status,amount_minor::text,currency_code,reason,
      requested_by_user_id::text,first_approver_user_id::text,created_at,evidence->'correction_execution' AS execution,
      (SELECT concat_ws(' ',s.first_name,s.last_name)||' ('||s.admission_number||')' FROM students s
        WHERE s.tenant_id=finance_approval_requests.tenant_id AND s.id::text=evidence->>'target_student_id') AS target_student_name,
      CASE WHEN subject_type='invoice' THEN (SELECT i.invoice_number FROM invoices i
        WHERE i.tenant_id=finance_approval_requests.tenant_id AND i.id::text=subject_id::text) END AS invoice_number,
      (status='approved' AND action='reversal' AND NOT evidence ? 'correction_execution' AND NOT evidence ? 'replacement_approval_id') AS can_reopen
      FROM finance_approval_requests WHERE tenant_id=$1 ORDER BY created_at DESC,id LIMIT $2 OFFSET $3`,[actor.tenant_id,limit,offset])).rows;
    return rows.map(row=>({...row,can_approve:row.requested_by_user_id!==actor.user_id &&
      (row.status==='pending_first_approval' || (row.status==='pending_second_approval' && actor.role==='principal' && row.first_approver_user_id!==actor.user_id)),
      can_cancel:['pending_first_approval','pending_second_approval'].includes(row.status) && (actor.role==='principal'||row.requested_by_user_id===actor.user_id)}));
  }

  async cancelFinanceApproval(id:string,reason:string) {
    this.requireFinanceActor();
    if(typeof reason!=='string'||reason.trim().length<5||reason.length>1000) throw new BadRequestException('Explain why this correction is being cancelled');
    const tenant=this.requireTenantId(),actor=this.requestContext.requireStore();
    return this.prisma.withRequestTransaction(async()=>{
      const row=await this.loadFinanceApprovalRequest(tenant,id);
      if(!row) throw new NotFoundException('Correction request was not found in this school');
      if(actor.role!=='principal' && row.requested_by_user_id!==actor.user_id) throw new ForbiddenException('Only the requester or Principal can cancel this request');
      if(!['pending_first_approval','pending_second_approval'].includes(String(row.status))) throw new ConflictException('Only pending correction requests can be cancelled');
      await this.executeSql(`UPDATE finance_approval_requests SET status='cancelled',updated_at=now(),
        evidence=evidence||jsonb_build_object('cancellation_reason',$3::text,'cancelled_by',$4::text) WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,id,reason.trim(),actor.user_id]);
      await this.recordFinanceApproval(tenant,id,'cancelled',{reason:reason.trim()});
      return {status:'cancelled'};
    });
  }

  async reopenHistoricalApproval(id:string,reason:string) {
    this.requireFinanceActor();
    if(typeof reason!=='string'||reason.trim().length<5||reason.length>1000)
      throw new BadRequestException('Explain why the historical correction needs a new review');
    const tenant=this.requireTenantId();
    return this.prisma.withRequestTransaction(async()=>{
      const original=await this.loadFinanceApprovalRequest(tenant,id);
      if(!original) throw new NotFoundException('Historical approval was not found in this school');
      const evidence=(original.evidence??{}) as Record<string,unknown>;
      if(original.status!=='approved'||original.action!=='reversal'||evidence.correction_execution)
        throw new ConflictException('Only a historical reversal approval without executed financial proof can be reopened');
      const replacementId=this.parseNullableUuid(evidence.replacement_approval_id);
      if(replacementId) {
        const replacement=await this.loadFinanceApprovalRequest(tenant,replacementId);
        if((replacement?.evidence as Record<string,unknown>)?.previous_approval_id===id) return replacement;
        throw new ConflictException('The linked replacement review needs investigation before continuing');
      }
      const discrepancyId=this.parseNullableUuid(original.reconciliation_discrepancy_id);
      if(!discrepancyId||original.subject_type!=='mpesa_reconciliation_discrepancy'||original.subject_id!==discrepancyId)
        throw new ConflictException('The original approval needs a valid linked payment discrepancy');
      const discrepancy=(await this.executeSql<Record<string,unknown>>(`SELECT * FROM mpesa_reconciliation_discrepancies
        WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,[tenant,discrepancyId])).rows[0];
      if(!discrepancy) throw new NotFoundException('The original discrepancy was not found in this school');
      if((discrepancy.evidence as Record<string,unknown>)?.correction_execution)
        throw new ConflictException('This discrepancy already has executed financial proof');
      await this.executeSql(`UPDATE mpesa_reconciliation_discrepancies SET resolution_status='under_review',resolved_at=NULL,
        resolved_by_user_id=NULL,approving_user_id=NULL,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,discrepancyId]);
      const replacement=await this.requestFinanceApproval({action:'reversal',subject_type:'mpesa_reconciliation_discrepancy',subject_id:discrepancyId!,
        reconciliation_discrepancy_id:discrepancyId,reconciliation_batch_id:this.parseNullableUuid(original.reconciliation_batch_id)??undefined,
        amount_minor:String(original.amount_minor??''),currency_code:String(original.currency_code),reason:reason.trim()});
      await this.executeSql(`UPDATE finance_approval_requests SET evidence=evidence||jsonb_build_object('previous_approval_id',$3::text,
        'previous_resolution',$4::jsonb) WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,replacement.id,id,JSON.stringify({
        status:discrepancy.resolution_status,resolved_at:discrepancy.resolved_at,resolved_by_user_id:discrepancy.resolved_by_user_id,
        approving_user_id:discrepancy.approving_user_id,evidence:discrepancy.evidence})]);
      await this.executeSql(`UPDATE finance_approval_requests SET evidence=evidence||jsonb_build_object('replacement_approval_id',$3::text),
        updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,id,replacement.id]);
      await this.recordFinanceApproval(tenant,id,'reopened',{replacement_approval_id:replacement.id,reason:reason.trim()});
      return replacement;
    });
  }

  async requestHistoricalStkReversal(paymentIntentId:string,reason:string) {
    this.requireFinanceActor();
    if(typeof reason!=='string'||reason.trim().length<5||reason.length>1000)
      throw new BadRequestException('Explain why this receipt needs a correction');
    const tenant=this.requireTenantId(),actor=this.requireUserId();
    const id=this.normalizeOptionalUuid(paymentIntentId,'payment_intent_id');
    if(!id) throw new BadRequestException('A payment receipt is required');
    return this.prisma.withRequestTransaction(async()=>{
      const payment=(await this.executeSql<{id:string;amount_minor:string;currency_code:string;ledger_transaction_id:string;completed_at:Date}>(`
        SELECT id,amount_minor::text,currency_code,ledger_transaction_id::text,completed_at FROM payment_intents
        WHERE tenant_id=$1 AND id=$2::uuid AND payment_owner='tenant' AND status='completed'
          AND student_id IS NOT NULL AND ledger_transaction_id IS NOT NULL FOR UPDATE`,[tenant,id])).rows[0];
      if(!payment) throw new NotFoundException('Completed STK receipt was not found in this school');
      const corrected=await this.executeSql(`SELECT 1 FROM student_fee_payment_reversals WHERE tenant_id=$1 AND payment_intent_id=$2::uuid
        UNION ALL SELECT 1 FROM manual_fee_payments WHERE tenant_id=$1 AND ledger_transaction_id::text=$3 LIMIT 1`,[tenant,id,payment.ledger_transaction_id]);
      if(corrected.rows.length) throw new ConflictException('This receipt is already corrected or managed through Collections');
      const provider=(await this.executeSql<{id:string;reference:string}>(`SELECT id,COALESCE(mpesa_receipt_number,checkout_request_id) AS reference
        FROM mpesa_transactions WHERE tenant_id=$1 AND payment_intent_id=$2::uuid AND ledger_transaction_id::text=$3 AND status='succeeded'
        ORDER BY created_at,id LIMIT 1`,[tenant,id,payment.ledger_transaction_id])).rows[0];
      if(!provider?.reference) throw new ConflictException('The original provider receipt must be verified before requesting a correction');
      const pending=(await this.executeSql(`SELECT a.* FROM finance_approval_requests a JOIN mpesa_reconciliation_discrepancies d
        ON d.tenant_id=a.tenant_id AND d.id=a.reconciliation_discrepancy_id WHERE a.tenant_id=$1 AND d.payment_intent_id=$2::uuid
        AND a.status IN ('pending_first_approval','pending_second_approval') ORDER BY a.created_at LIMIT 1`,[tenant,id])).rows[0];
      const message='Correction requested. Two independent reviews, including final Principal approval, are required in Collections → Financial correction reviews.';
      if(pending) {
        if(pending.requested_by_user_id===actor && pending.action==='reversal' && pending.reason===reason.trim()) return {...pending,message};
        throw new ConflictException('This receipt already has a pending review in Collections');
      }
      const batch=(await this.executeSql<{id:string}>(`INSERT INTO mpesa_reconciliation_batches(tenant_id,report_date,
        window_started_at,window_ended_at,reconciliation_state,summary,discrepancy_count,generated_by_user_id)
        VALUES($1,CURRENT_DATE,now()-interval '1 second',now(),'manual_review_required',
          '{"source":"staff_receipt_review"}'::jsonb,1,$2::uuid) RETURNING id`,[tenant,actor])).rows[0];
      const discrepancy=(await this.executeSql<{id:string}>(`INSERT INTO mpesa_reconciliation_discrepancies(tenant_id,reconciliation_batch_id,
        discrepancy_type,reconciliation_state,severity,detail,occurred_at,provider_transaction_id,payment_intent_id,mpesa_transaction_id,
        ledger_transaction_id,evidence) VALUES($1,$2::uuid,'staff_requested_correction','manual_review_required','warning',$3,
          COALESCE($4::timestamptz,now()),$5,$6::uuid,$7::uuid,$8::uuid,'{"source":"staff_receipt_review"}'::jsonb) RETURNING id`,
        [tenant,batch.id,reason.trim(),payment.completed_at,provider.reference,id,provider.id,payment.ledger_transaction_id])).rows[0];
      const request=await this.requestFinanceApproval({action:'reversal',subject_type:'mpesa_reconciliation_discrepancy',subject_id:discrepancy.id,
        reconciliation_discrepancy_id:discrepancy.id,reconciliation_batch_id:batch.id,amount_minor:payment.amount_minor,
        currency_code:payment.currency_code,reason:reason.trim(),evidence:{source:'staff_receipt_review'}});
      return {...request,message};
    });
  }

  async requestFinanceApproval(input: FinanceApprovalRequestInput) {
    this.requireFinanceActor();
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const action = this.normalizeFinanceApprovalAction(input.action);
    const requestKey=this.normalizeOptionalUuid(input.request_key??null,'request_key');
    if(action!=='reversal'&&!requestKey) throw new BadRequestException('A unique correction request key is required');
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

    if(reason.length<5 || reason.length>1000) throw new BadRequestException('Provide a correction reason of 5 to 1,000 characters');
    const collectionAction=['move_payment','post_after_mismatch'].includes(action) && subjectType==='collection_payment';
    const invoiceAction=action==='write_off' && subjectType==='invoice';
    const receiptAction=action==='move_payment' && ['manual_fee_payment','payment_intent'].includes(subjectType);
    if(collectionAction && (reconciliationDiscrepancyId||reconciliationBatchId))
      throw new BadRequestException('A collection correction cannot close an unrelated bank discrepancy');
    if(!collectionAction && !invoiceAction && !receiptAction && (subjectType!=='mpesa_reconciliation_discrepancy' || subjectId!==reconciliationDiscrepancyId))
      throw new BadRequestException('The approval subject must be its linked reconciliation discrepancy');
    if(amountMinor===null) throw new BadRequestException('The exact correction amount is required');
    if(action==='write_off' && !invoiceAction) throw new BadRequestException('Write-offs apply to an unpaid invoice. They cannot resolve an unexplained incoming payment.');
    const evidence=redactReviewEvidence(input.evidence ?? {}) as Record<string,unknown>;
    delete evidence.correction_execution;
    delete evidence.replacement_approval_id;
    delete evidence.previous_approval_id;
    for(const key of ['collection_payment_id','target_student_id','original_receipt_id','invoice_id','request_key']) delete evidence[key];
    return this.prisma.withRequestTransaction(async()=>{
    if(requestKey) {
      await this.executeSql('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',[`${tenantId}:finance-correction:${requestKey}`]);
      const prior=(await this.executeSql<Record<string,any>>('SELECT *,amount_minor::text FROM finance_approval_requests WHERE tenant_id=$1 AND evidence->>\'request_key\'=$2',[tenantId,requestKey])).rows[0];
      if(prior) {
        if(prior.action!==action||prior.subject_type!==subjectType||prior.subject_id!==subjectId||prior.amount_minor!==amountMinor||prior.currency_code.trim()!==currencyCode
          ||prior.reason!==reason||prior.requested_by_user_id!==actorUserId||(action!=='write_off'&&prior.evidence.target_student_id!==input.target_student_id)
          ||(prior.reconciliation_discrepancy_id??null)!==reconciliationDiscrepancyId) throw new ConflictException('This request key belongs to different correction details');
        return prior;
      }
      evidence.request_key=requestKey;
    }
    if(subjectType==='mpesa_reconciliation_discrepancy') await this.executeSql(
      'SELECT id FROM mpesa_reconciliation_discrepancies WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE',[tenantId,subjectId]);
    if(!receiptAction && (collectionAction || ['move_payment','post_after_mismatch'].includes(action))) {
      const payment=(await this.executeSql<{id:string;amount_minor:string;currency_code:string;status:string;student_id:string;manual_fee_payment_id:string}>(`
        SELECT p.id,p.amount_minor::text,p.currency_code,p.status,p.student_id,p.manual_fee_payment_id FROM collection_payments p
        WHERE p.tenant_id=$1 AND (($3 AND p.id=$2::uuid) OR (NOT $3 AND p.provider_code='safaricom' AND EXISTS(
          SELECT 1 FROM mpesa_reconciliation_discrepancies d WHERE d.tenant_id=$1 AND d.id=$2::uuid AND d.provider_transaction_id=p.provider_transaction_id))) FOR UPDATE`,
        [tenantId,subjectId,collectionAction])).rows[0];
      if(!payment||payment.amount_minor!==amountMinor||payment.currency_code.trim()!==currencyCode)
        throw new ConflictException('Select a confirmed collection with the exact provider amount and currency');
      if(action==='move_payment' ? payment.status!=='posted'||payment.student_id===input.target_student_id : !['verified','unmatched'].includes(payment.status))
        throw new ConflictException('Select an eligible collection and a different learner for a move');
      if(!input.target_student_id || !(await this.executeSql('SELECT id FROM students WHERE tenant_id=$1 AND id::text=$2 AND deleted_at IS NULL',[tenantId,input.target_student_id])).rows.length)
        throw new NotFoundException('Choose the intended learner in this school');
      if((await this.executeSql(`SELECT id FROM finance_approval_requests WHERE tenant_id=$1 AND evidence->>'collection_payment_id'=$2
        AND status IN ('pending_first_approval','pending_second_approval')`,[tenantId,payment.id])).rows.length)
        throw new ConflictException('This collection already has a pending correction');
      Object.assign(evidence,{collection_payment_id:payment.id,target_student_id:input.target_student_id,original_receipt_id:payment.manual_fee_payment_id});
    }
    if(receiptAction) {
      if(reconciliationDiscrepancyId||reconciliationBatchId) throw new BadRequestException('Choose the original receipt without an unrelated discrepancy');
      const source=(await this.executeSql<{student_id:string;amount_minor:string;currency_code:string}>(subjectType==='manual_fee_payment'
        ? `SELECT COALESCE(student_id::text,(SELECT metadata->>'student_id' FROM invoices i WHERE i.tenant_id=m.tenant_id AND i.id::text=m.invoice_id::text)) AS student_id,
            amount_minor::text,currency_code FROM manual_fee_payments m WHERE tenant_id=$1 AND id=$2::uuid AND status='cleared'
            AND NOT EXISTS(SELECT 1 FROM collection_payments c WHERE c.tenant_id=$1 AND c.manual_fee_payment_id=m.id) FOR UPDATE`
        : `SELECT student_id::text,amount_minor::text,currency_code FROM payment_intents p WHERE tenant_id=$1 AND id=$2::uuid AND status='completed' AND payment_owner='tenant'
            AND NOT EXISTS(SELECT 1 FROM student_fee_payment_reversals r WHERE r.tenant_id=$1 AND r.payment_intent_id=p.id) FOR UPDATE`,[tenantId,subjectId])).rows[0];
      if(!source?.student_id||source.student_id===input.target_student_id||source.amount_minor!==amountMinor||source.currency_code.trim()!==currencyCode)
        throw new ConflictException('Choose an unreversed receipt, its exact amount and a different learner');
      if(!input.target_student_id||!(await this.executeSql('SELECT id FROM students WHERE tenant_id=$1 AND id::text=$2 AND deleted_at IS NULL',[tenantId,input.target_student_id])).rows.length)
        throw new NotFoundException('Choose the intended learner in this school');
      if((await this.executeSql(`SELECT id FROM finance_approval_requests WHERE tenant_id=$1 AND subject_type=$2 AND subject_id=$3::uuid
        AND status IN ('pending_first_approval','pending_second_approval')`,[tenantId,subjectType,subjectId])).rows.length)
        throw new ConflictException('This receipt already has a pending correction');
      Object.assign(evidence,{original_receipt_id:subjectId,target_student_id:input.target_student_id});
    }
    if(invoiceAction) {
      if(reconciliationDiscrepancyId||reconciliationBatchId) throw new BadRequestException('Invoice write-offs must not close bank discrepancies');
      const invoice=(await this.executeSql<{student_id:string;balance:string}>(`SELECT metadata->>'student_id' AS student_id,
        (total_amount_minor-amount_paid_minor)::text AS balance FROM invoices WHERE tenant_id=$1 AND id::text=$2
        AND currency_code=$3 AND status IN ('open','pending_payment') FOR UPDATE`,[tenantId,subjectId,currencyCode])).rows[0];
      if(!invoice?.student_id || BigInt(invoice.balance)<BigInt(amountMinor)) throw new ConflictException('The write-off must fit the selected learner invoice balance');
      if((await this.executeSql(`SELECT id FROM finance_approval_requests WHERE tenant_id=$1 AND subject_type='invoice' AND subject_id=$2::uuid
        AND status IN ('pending_first_approval','pending_second_approval')`,[tenantId,subjectId])).rows.length)
        throw new ConflictException('This invoice already has a pending write-off review');
      Object.assign(evidence,{invoice_id:subjectId,target_student_id:invoice.student_id});
    }
    if(!collectionAction && !invoiceAction && !receiptAction) {
    const discrepancy=(await this.executeSql(`SELECT id FROM mpesa_reconciliation_discrepancies WHERE tenant_id=$1 AND id=$2::uuid
      AND ($3::uuid IS NULL OR reconciliation_batch_id=$3::uuid) AND resolution_status IN ('open','under_review') FOR UPDATE`,
      [tenantId,reconciliationDiscrepancyId,reconciliationBatchId])).rows[0];
    if(!discrepancy) throw new NotFoundException('Open reconciliation discrepancy was not found in this school and batch');
    const pending=await this.executeSql(`SELECT id FROM finance_approval_requests WHERE tenant_id=$1 AND reconciliation_discrepancy_id=$2::uuid
      AND status IN ('pending_first_approval','pending_second_approval')`,[tenantId,reconciliationDiscrepancyId]);
    if(pending.rows.length) throw new ConflictException('This discrepancy already has a pending correction request');
    }
    const result = await this.executeSql<Record<string, unknown>>(
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
        JSON.stringify(evidence),
      ],
    );
    const request = result.rows[0];

    if (!request) {
      throw new BadRequestException('Finance approval request could not be created');
    }

    await this.recordFinanceApproval(tenantId,String(request.id),'requested',{action,subject_type:subjectType,subject_id:subjectId,amount_minor:amountMinor,
      target_student_id:evidence.target_student_id??null});
    return request;
    });
  }

  async approveFinanceApproval(requestId: string) {
    this.requireFinanceActor();
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const approvalRequestId = this.normalizeOptionalUuid(requestId, 'approval_request_id');

    if (!approvalRequestId) {
      throw new BadRequestException('Finance approval request id is required');
    }

    return this.prisma.withRequestTransaction(async()=>{
    const approval = await this.loadFinanceApprovalRequest(tenantId, approvalRequestId);

    if (!approval) {
      throw new NotFoundException('Finance approval request was not found');
    }

    if (String(approval.requested_by_user_id ?? '') === actorUserId) {
      throw new ForbiddenException('Finance approval requester cannot approve their own request');
    }

    if (approval.status === 'pending_first_approval') {
      const updated=await this.recordFirstFinanceApproval(tenantId, approvalRequestId, actorUserId);
      await this.recordFinanceApproval(tenantId,approvalRequestId,'first_approved');
      return updated;
    }

    if (approval.status === 'pending_second_approval') {
      if (String(approval.first_approver_user_id ?? '') === actorUserId) {
        throw new ForbiddenException('Finance approval requires a distinct approver for second approval');
      }
      if(this.requestContext.requireStore().role!=='principal') throw new ForbiddenException('The Principal must give final approval for a financial correction');

      const approved = await this.recordSecondFinanceApproval(tenantId, approvalRequestId, actorUserId);
      if(!this.corrections || !approved) throw new ConflictException('Financial correction service is unavailable; retry when finance services recover');
      const execution=await this.corrections.execute(approvalRequestId);
      await this.resolveFinanceApprovalSubject(tenantId, approved, actorUserId, execution);
      await this.executeSql("UPDATE finance_approval_requests SET evidence=evidence||jsonb_build_object('correction_execution',$3::jsonb) WHERE tenant_id=$1 AND id=$2::uuid",
        [tenantId,approvalRequestId,JSON.stringify(execution)]);
      await this.recordFinanceApproval(tenantId,approvalRequestId,'executed',execution);
      return {...approved,evidence:{...(approved.evidence as Record<string,unknown> ?? {}),correction_execution:execution}};
    }

    if(approval.status==='approved' && (approval.evidence as Record<string,unknown> | null)?.correction_execution) {
      if(!this.corrections) throw new ConflictException('Financial correction service is unavailable');
      await this.corrections.execute(approvalRequestId);
      return approval;
    }
    throw new BadRequestException(`Finance approval request is not pending approval; current status is "${approval.status}"`);
    });
  }

  private requireFinanceActor(read=false) {
    const actor=this.requestContext.requireStore();
    if(!actor.is_authenticated || !actor.user_id || !actor.tenant_id || !['accountant','bursar','principal'].includes(actor.role ?? '') ||
      !(actor.permissions ?? []).some(permission=>['*:*','billing:*','billing:write','billing:update',...(read?['billing:read']:[])].includes(permission)))
      throw new ForbiddenException('School finance permission is required for financial corrections');
  }

  private async recordFinanceApproval(tenant:string,id:string,status:string,execution:Record<string,unknown>={}) {
    if(!this.schoolEvents || !this.audit) throw new ConflictException('Financial audit service is unavailable; retry when finance services recover');
    await this.audit.record({tenant_id:tenant,action:`finance.correction_${status}`,resource_type:'finance_approval',resource_id:id,metadata:execution});
    await this.schoolEvents.recordSchoolOperation({schoolId:tenant,event:{id:randomUUID(),type:`finance.correction_${status}`,module:'finance',entityId:id,
      title:'Financial correction review',body:status==='executed'?'The approved correction was executed and its financial result verified.':status==='cancelled'?'The correction request was cancelled; no payment was changed.':'A financial correction is awaiting independent review.',
      payload:{approval_id:id,status,...execution}},notifications:[{id:`finance-correction:${id}:${status}`,title:'Financial correction review',
        body:status==='executed'?'The approved correction was executed and verified.':status==='cancelled'?'The correction request was cancelled.':'A financial correction requires independent review.',
        audienceRoles:['principal','accountant','bursar'],priority:'normal',href:'/collections'}]});
  }

  private async loadSuccessfulMpesaRows(
    tenantId: string,
    windowStart: Date,
    windowEnd: Date,
    paymentChannelId: string | null,
  ): Promise<SuccessfulMpesaRow[]> {
    const result = await this.executeSql<SuccessfulMpesaRow>(
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
          t.total_amount_minor::numeric::bigint::text AS linked_transaction_amount_minor,
          t.posted_at AS linked_transaction_posted_at
        FROM mpesa_transactions mt
        INNER JOIN payment_intents pi
          ON pi.tenant_id = mt.tenant_id
         AND pi.id = mt.payment_intent_id
        LEFT JOIN transactions t
          ON t.tenant_id = mt.tenant_id
         AND t.id::text = mt.ledger_transaction_id::text
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
    const result = await this.executeSql<MissingCallbackRow>(
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
    const result = await this.executeSql<DuplicateReceiptRow>(
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
    const result = await this.executeSql<UnmatchedLedgerRow>(
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
            t.total_amount_minor::numeric::bigint::text AS total_amount_minor,
            t.currency_code,
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
         AND mt.ledger_transaction_id::text = ct.transaction_id::text
         AND mt.status = 'succeeded'
        WHERE mt.id IS NULL
          -- Unified C2B collections and governed corrections retain their own
          -- durable provenance; they do not create another STK provider row.
          AND NOT EXISTS (
            SELECT 1 FROM collection_payments cp
            WHERE cp.tenant_id=$1 AND cp.provider_code='safaricom'
              AND cp.status IN ('unmatched','posted','reversed')
              AND cp.amount_minor=ct.total_amount_minor::bigint AND cp.currency_code=ct.currency_code
              AND ct.transaction_id::text IN (cp.ledger_transaction_id::text,cp.suspense_transaction_id::text,cp.suspense_release_transaction_id::text)
          )
          AND NOT EXISTS (
            SELECT 1 FROM manual_fee_payments receipt
            WHERE receipt.tenant_id=$1 AND receipt.status='reversed'
              AND receipt.reversal_ledger_transaction_id=ct.transaction_id
              AND receipt.amount_minor=ct.total_amount_minor::bigint AND receipt.currency_code=ct.currency_code
          )
          AND NOT EXISTS (
            SELECT 1 FROM student_fee_payment_reversals reversal
            WHERE reversal.tenant_id=$1 AND reversal.reversal_ledger_transaction_id=ct.transaction_id
              AND reversal.amount_minor=ct.total_amount_minor::bigint AND reversal.currency_code=ct.currency_code
          )
          AND NOT EXISTS (
            SELECT 1 FROM fee_credit_refunds refund
            WHERE refund.tenant_id=$1 AND refund.status='completed' AND refund.ledger_transaction_id=ct.transaction_id::text
              AND refund.amount_minor=ct.total_amount_minor::bigint AND refund.currency_code=ct.currency_code
          )
          AND NOT EXISTS (
            SELECT 1 FROM fee_payment_corrections correction WHERE correction.tenant_id=$1
              AND ct.transaction_id::text IN (correction.original_ledger_id,correction.reversal_ledger_id,correction.replacement_ledger_id)
              AND correction.amount_minor=ct.total_amount_minor::bigint AND correction.currency_code=ct.currency_code
          )
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
    const result = await this.executeSql<C2bReviewRow>(
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
          AND NOT (c2b.status='reversed' AND EXISTS (
            SELECT 1 FROM collection_payments payment
            JOIN manual_fee_payments receipt ON receipt.tenant_id=payment.tenant_id AND receipt.id=payment.manual_fee_payment_id
            JOIN transactions reversal ON reversal.tenant_id=receipt.tenant_id AND reversal.id=receipt.reversal_ledger_transaction_id
            WHERE payment.tenant_id=c2b.tenant_id AND payment.provider_code='safaricom'
              AND payment.provider_transaction_id=c2b.trans_id AND payment.status='reversed' AND receipt.status='reversed'
              AND receipt.id=c2b.manual_fee_payment_id AND payment.ledger_transaction_id::text=c2b.ledger_transaction_id::text
              AND payment.amount_minor=c2b.amount_minor AND payment.currency_code=c2b.currency_code
              AND receipt.amount_minor=c2b.amount_minor AND receipt.currency_code=c2b.currency_code
              AND reversal.total_amount_minor::numeric=c2b.amount_minor AND reversal.currency_code=c2b.currency_code
          ))
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
    const result = await this.executeSql<ActiveMpesaPaymentChannelRow>(
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
    const batchResult = await this.executeSql<ReconciliationBatchRow>(
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
      await this.executeSql(
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
    const result = await this.executeSql<Record<string, unknown>>(
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
    const result = await this.executeSql<Record<string, unknown>>(
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
    const result = await this.executeSql<Record<string, unknown>>(
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
    execution: Record<string,unknown>,
  ): Promise<void> {
    if (!approval || approval.status !== 'approved') {
      return;
    }

    const reconciliationDiscrepancyId = this.parseNullableUuid(approval.reconciliation_discrepancy_id);

    if (!reconciliationDiscrepancyId) {
      return;
    }

    await this.executeSql(
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
            'finance_approval_status', 'approved',
            'correction_execution', $6::jsonb
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
        JSON.stringify(execution),
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

  private normalizeOptionalPositiveInteger(value: number | string | undefined, fieldName: string): string | null {
    if(value==null) return null;
    if(typeof value==='number' && !Number.isSafeInteger(value)) throw new BadRequestException(`${fieldName} must be an exact positive integer`);
    const amount=String(value);
    if(!/^[1-9][0-9]{0,18}$/.test(amount) || BigInt(amount)>9223372036854775807n)
      throw new BadRequestException(`${fieldName} must be an exact positive integer`);
    return amount;
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
