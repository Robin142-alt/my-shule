import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { CreateAccountantExpenseDto } from './dto/create-accountant-expense.dto';
import { CreateFeeFollowUpDto } from './dto/create-fee-follow-up.dto';

const ACCOUNTANT_WORKFLOW_TARGET_ROLES: ReadonlySet<string> = new Set([
  'accountant',
  'principal',
  'deputy_principal',
  'secretary',
]);

const FEE_FOLLOW_UP_STAFF_ROLES = [
  'accountant',
  'principal',
  'deputy_principal',
  'secretary',
] as const;

type AccountantOverviewMetricRow = {
  collected_today_minor: unknown;
  receipts_today_count: unknown;
  outstanding_balance_minor: unknown;
  balances_above_threshold_count: unknown;
  open_invoice_count: unknown;
  mpesa_review_count: unknown;
  active_fee_structure_count: unknown;
};

type AccountantOverviewActivityRow = {
  id: string;
  entity_type: 'payment' | 'invoice';
  reference: string;
  description: string;
  amount_minor: unknown;
  status: string;
  occurred_at: Date | string;
};

type AccountantExpenseRow = {
  id: string;
  date: Date | string;
  category: string;
  description: string;
  amount_minor: unknown;
  status: string;
};

type AccountantExpenseMetricRow = {
  total_this_month_minor: unknown;
  pending_approval: unknown;
  approved: unknown;
  total_count: unknown;
};

@Injectable()
export class AccountantCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requestContext.getStore()?.user_id;

    return this.prisma.executeWithTenant(tenantId, actorUserId, async (tx) => {
      const metricRows = await tx.$queryRawUnsafe<AccountantOverviewMetricRow[]>(
        `
        WITH payment_metrics AS (
          SELECT
            COALESCE(
              SUM(amount_minor) FILTER (
                WHERE status NOT IN ('bounced', 'reversed')
                  AND received_at >= (
                    date_trunc('day', timezone('Africa/Nairobi', NOW()))
                    AT TIME ZONE 'Africa/Nairobi'
                  )
                  AND received_at < (
                    (date_trunc('day', timezone('Africa/Nairobi', NOW())) + INTERVAL '1 day')
                    AT TIME ZONE 'Africa/Nairobi'
                  )
              ),
              0
            )::text AS collected_today_minor,
            COUNT(*) FILTER (
              WHERE status NOT IN ('bounced', 'reversed')
                AND received_at >= (
                  date_trunc('day', timezone('Africa/Nairobi', NOW()))
                  AT TIME ZONE 'Africa/Nairobi'
                )
                AND received_at < (
                  (date_trunc('day', timezone('Africa/Nairobi', NOW())) + INTERVAL '1 day')
                  AT TIME ZONE 'Africa/Nairobi'
                )
            )::text AS receipts_today_count
          FROM manual_fee_payments
          WHERE tenant_id = $1
        ),
        student_balances AS (
          SELECT
            metadata ->> 'student_id' AS student_id,
            SUM(GREATEST(total_amount_minor - amount_paid_minor, 0)) AS balance_minor
          FROM invoices
          WHERE tenant_id = $1
            AND NULLIF(metadata ->> 'student_id', '') IS NOT NULL
            AND status NOT IN ('paid', 'void')
          GROUP BY metadata ->> 'student_id'
        ),
        invoice_metrics AS (
          SELECT
            COALESCE(SUM(balance_minor), 0)::text AS outstanding_balance_minor,
            COUNT(*) FILTER (WHERE balance_minor > 1000000)::text AS balances_above_threshold_count
          FROM student_balances
        ),
        open_invoices AS (
          SELECT COUNT(*)::text AS open_invoice_count
          FROM invoices
          WHERE tenant_id = $1
            AND NULLIF(metadata ->> 'student_id', '') IS NOT NULL
            AND status NOT IN ('paid', 'void')
        ),
        mpesa_metrics AS (
          SELECT COUNT(*)::text AS mpesa_review_count
          FROM mpesa_c2b_payments
          WHERE tenant_id = $1
            AND status IN (
              'verified_unmatched',
              'amount_mismatch',
              'duplicate_provider_receipt',
              'missing_provider_record',
              'manual_review_required',
              'pending_review'
            )
        ),
        fee_structure_metrics AS (
          SELECT COUNT(*)::text AS active_fee_structure_count
          FROM fee_structures
          WHERE tenant_id = $1
            AND status = 'active'
        )
        SELECT
          payment_metrics.collected_today_minor,
          payment_metrics.receipts_today_count,
          invoice_metrics.outstanding_balance_minor,
          invoice_metrics.balances_above_threshold_count,
          open_invoices.open_invoice_count,
          mpesa_metrics.mpesa_review_count,
          fee_structure_metrics.active_fee_structure_count
        FROM payment_metrics
        CROSS JOIN invoice_metrics
        CROSS JOIN open_invoices
        CROSS JOIN mpesa_metrics
        CROSS JOIN fee_structure_metrics
        `,
        tenantId,
      );

      const activityRows = await tx.$queryRawUnsafe<AccountantOverviewActivityRow[]>(
        `
        WITH finance_activity AS (
          SELECT
            id::text,
            'payment'::text AS entity_type,
            receipt_number AS reference,
            COALESCE(NULLIF(payer_name, ''), 'Fee payment') AS description,
            amount_minor::text,
            status,
            received_at AS occurred_at
          FROM manual_fee_payments
          WHERE tenant_id = $1

          UNION ALL

          SELECT
            id::text,
            'invoice'::text AS entity_type,
            invoice_number AS reference,
            COALESCE(NULLIF(description, ''), 'Student fee invoice') AS description,
            total_amount_minor::text,
            status,
            issued_at AS occurred_at
          FROM invoices
          WHERE tenant_id = $1
            AND NULLIF(metadata ->> 'student_id', '') IS NOT NULL
        )
        SELECT
          id,
          entity_type,
          reference,
          description,
          amount_minor,
          status,
          occurred_at
        FROM finance_activity
        ORDER BY occurred_at DESC
        LIMIT 8
        `,
        tenantId,
      );

      const metrics = metricRows[0] ?? {
        collected_today_minor: '0',
        receipts_today_count: '0',
        outstanding_balance_minor: '0',
        balances_above_threshold_count: '0',
        open_invoice_count: '0',
        mpesa_review_count: '0',
        active_fee_structure_count: '0',
      };

      return {
        generated_at: new Date().toISOString(),
        metrics: {
          collected_today_minor: String(metrics.collected_today_minor ?? '0'),
          receipts_today_count: Number(metrics.receipts_today_count ?? 0),
          outstanding_balance_minor: String(metrics.outstanding_balance_minor ?? '0'),
          balances_above_threshold_count: Number(metrics.balances_above_threshold_count ?? 0),
          open_invoice_count: Number(metrics.open_invoice_count ?? 0),
          mpesa_review_count: Number(metrics.mpesa_review_count ?? 0),
          active_fee_structure_count: Number(metrics.active_fee_structure_count ?? 0),
        },
        recent_activity: activityRows.map((row) => ({
          id: row.id,
          entity_type: row.entity_type,
          reference: row.reference,
          description: row.description,
          amount_minor: String(row.amount_minor ?? '0'),
          status: row.status,
          occurred_at: row.occurred_at instanceof Date
            ? row.occurred_at.toISOString()
            : String(row.occurred_at),
        })),
      };
    });
  }

  async getExpenses() {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requestContext.getStore()?.user_id;

    return this.prisma.executeWithTenant(tenantId, actorUserId, async (tx) => {
      const [metricRows, expenseRows] = await Promise.all([
        tx.$queryRawUnsafe<AccountantExpenseMetricRow[]>(
          `
          SELECT
            COALESCE(
              SUM(amount_minor) FILTER (
                WHERE created_at >= date_trunc('month', timezone('Africa/Nairobi', NOW()))
                  AT TIME ZONE 'Africa/Nairobi'
              ),
              0
            )::text AS total_this_month_minor,
            COUNT(*) FILTER (WHERE lower(status) IN ('pending', 'pending_approval'))::text AS pending_approval,
            COUNT(*) FILTER (WHERE lower(status) = 'approved')::text AS approved,
            COUNT(*)::text AS total_count
          FROM school_expenses
          WHERE tenant_id = $1
          `,
          tenantId,
        ),
        tx.$queryRawUnsafe<AccountantExpenseRow[]>(
          `
          SELECT
            id::text,
            created_at AS date,
            category,
            description,
            amount_minor::text,
            status
          FROM school_expenses
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT 100
          `,
          tenantId,
        ),
      ]);
      const metrics = metricRows[0] ?? {
        total_this_month_minor: '0',
        pending_approval: '0',
        approved: '0',
        total_count: '0',
      };

      return {
        metrics: {
          total_this_month_minor: String(metrics.total_this_month_minor ?? '0'),
          pending_approval: Number(metrics.pending_approval ?? 0),
          approved: Number(metrics.approved ?? 0),
          total_count: Number(metrics.total_count ?? 0),
        },
        items: expenseRows.map((row) => ({
          id: row.id,
          date: row.date instanceof Date ? row.date.toISOString() : String(row.date),
          category: row.category,
          description: row.description,
          amount_minor: String(row.amount_minor ?? '0'),
          status: row.status,
        })),
      };
    });
  }

  async createExpense(dto: CreateAccountantExpenseDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requestContext.getStore()?.user_id;
    const amountMinor = BigInt(dto.amount_minor);

    if (amountMinor > 9_223_372_036_854_775_807n) {
      throw new BadRequestException('Expense amount exceeds the supported financial limit');
    }

    const expense = await this.prisma.executeWithTenant(
      tenantId,
      actorUserId,
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<AccountantExpenseRow[]>(
          `
          INSERT INTO school_expenses (
            tenant_id,
            category,
            description,
            amount_minor,
            status
          )
          VALUES ($1, $2, $3, $4::bigint, 'pending')
          RETURNING
            id::text,
            created_at AS date,
            category,
            description,
            amount_minor::text,
            status
          `,
          tenantId,
          dto.category,
          dto.description,
          dto.amount_minor,
        );

        return rows[0];
      },
    );

    if (!expense) {
      throw new Error('Expense request could not be persisted');
    }

    await this.recordAction({
      action: 'expense_submitted',
      title: 'Expense submitted for approval',
      message: `${dto.description} was submitted for principal approval.`,
      entity_type: 'school_expense',
      entity_id: expense.id,
      source_dashboard: 'accountant-expenses-workspace',
      target_roles: ['accountant', 'principal'],
      priority: 'high',
      payload: {
        category: dto.category,
        amount_minor: dto.amount_minor,
        status: expense.status,
      },
    });

    return {
      success: true,
      message: 'Expense saved and submitted for principal approval.',
      expense: {
        ...expense,
        date: expense.date instanceof Date ? expense.date.toISOString() : String(expense.date),
        amount_minor: String(expense.amount_minor),
      },
    };
  }

  async recordAction(dto: any) {
    const tenantId = this.requireTenantId();
    const store = this.requestContext.getStore();
    const action = String(dto?.action || 'finance_action').trim().replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    const title = String(dto?.title || 'Finance workflow saved').trim().slice(0, 160);
    const message = String(dto?.message || 'A finance workflow action was saved.').trim().slice(0, 500);
    const entityType = String(dto?.entity_type || 'finance_workflow').trim().slice(0, 80);
    const entityId = dto?.entity_id ? String(dto.entity_id).trim().slice(0, 120) : null;
    const requestedTargetRoles: string[] = Array.isArray(dto?.target_roles)
      ? [...new Set<string>(dto.target_roles.map((role: unknown): string => String(role).trim().toLowerCase()))]
      : ['accountant', 'principal'];
    if (
      requestedTargetRoles.length === 0
      || requestedTargetRoles.some((role) => !ACCOUNTANT_WORKFLOW_TARGET_ROLES.has(role))
    ) {
      throw new BadRequestException('Finance workflow recipients must be authorized school finance or leadership roles');
    }
    const targetRoles = requestedTargetRoles;
    const eventType = `accountant.${action}`;

    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: store?.user_id,
      sourceRole: store?.role || 'accountant',
      targetRoles,
      eventType,
      entityType,
      entityId,
      title,
      message,
      priority: dto?.priority === 'high' || dto?.priority === 'critical' ? dto.priority : 'normal',
      payload: {
        source_dashboard: dto?.source_dashboard || 'accountant-command-center',
        ...dto,
      },
    });

    await this.operations.notifyRoles(tenantId, {
      key: `${eventType}-${(event as any)?.id ?? Date.now()}`,
      type: eventType,
      title,
      body: message,
      targetRoles,
      metadata: {
        event_id: (event as any)?.id,
        entity_type: entityType,
        entity_id: entityId,
        ...(dto?.payload && typeof dto.payload === 'object' ? dto.payload : {}),
      },
    });

    return { success: true, message: 'Finance workflow saved and notifications queued', event };
  }

  async recordFeeFollowUp(dto: CreateFeeFollowUpDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    if (!actorUserId) {
      throw new UnauthorizedException('Authenticated user is required for fee follow-up');
    }

    const suppliedStudents = Array.isArray(dto.payload?.students) ? dto.payload.students : [];
    const studentIds = [...new Set(suppliedStudents.map((student: unknown) => {
      const candidate = student && typeof student === 'object'
        ? (student as Record<string, unknown>).student_id
        : null;
      return this.operations.uuidOrNull(candidate);
    }))];
    if (
      studentIds.length === 0
      || studentIds.length > 200
      || studentIds.some((studentId) => !studentId)
      || studentIds.length !== suppliedStudents.length
    ) {
      throw new BadRequestException('Select between 1 and 200 unique learners for fee follow-up');
    }

    const result = await this.operations.writeSql<{
      requested_student_count: number;
      eligible_student_count: number;
      covered_student_count: number;
      guardian_notification_count: number;
      staff_notification_count: number;
      event_id: string | null;
    }>(
      `
        WITH requested_students AS (
          SELECT DISTINCT requested.student_id
          FROM unnest($3::uuid[]) AS requested(student_id)
        ), invoice_balances AS (
          SELECT
            invoice.metadata->>'student_id' AS student_id,
            COALESCE(SUM(invoice.total_amount_minor - invoice.amount_paid_minor), 0)::bigint AS balance_minor
          FROM invoices invoice
          WHERE invoice.tenant_id = $1
            AND NULLIF(invoice.metadata->>'student_id', '') IS NOT NULL
          GROUP BY invoice.metadata->>'student_id'
        ), unapplied_credits AS (
          SELECT
            payment.student_id::text AS student_id,
            COALESCE(SUM(payment.amount_minor), 0)::bigint AS credit_minor
          FROM manual_fee_payments payment
          WHERE payment.tenant_id = $1
            AND payment.status = 'cleared'
            AND payment.student_id IS NOT NULL
            AND payment.invoice_id IS NULL
          GROUP BY payment.student_id
        ), candidate_students AS (
          SELECT
            student.id AS student_id,
            COALESCE(
              NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), ''),
              student.admission_number,
              'Learner'
            ) AS student_name,
            GREATEST(
              COALESCE(invoice_balance.balance_minor, 0) - COALESCE(credit.credit_minor, 0),
              0
            )::bigint AS balance_minor
          FROM requested_students requested
          INNER JOIN students student
            ON student.tenant_id = $1
           AND student.id = requested.student_id
           AND student.deleted_at IS NULL
           AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
          LEFT JOIN invoice_balances invoice_balance
            ON invoice_balance.student_id = student.id::text
          LEFT JOIN unapplied_credits credit
            ON credit.student_id = student.id::text
        ), eligible_students AS (
          SELECT *
          FROM candidate_students
          WHERE balance_minor > 0
        ), linked_guardians AS (
          SELECT DISTINCT
            eligible.student_id,
            guardian.id AS guardian_id,
            guardian.user_id
          FROM eligible_students eligible
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id = eligible.student_id
           AND LOWER(guardian.status) = 'active'
           AND guardian.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
        ), coverage AS (
          SELECT
            (SELECT COUNT(*)::int FROM requested_students) AS requested_student_count,
            (SELECT COUNT(*)::int FROM eligible_students) AS eligible_student_count,
            (SELECT COUNT(DISTINCT student_id)::int FROM linked_guardians) AS covered_student_count
        ), batch AS (
          SELECT gen_random_uuid() AS id
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $2::uuid,
            'accountant',
            $4::jsonb,
            $5,
            'student_arrears_batch',
            batch.id::text,
            'Fee arrears guardian follow-up queued',
            coverage.eligible_student_count::text || ' learner fee reminder(s) queued for exact linked guardians.',
            'normal',
            jsonb_build_object(
              'recipient_scope', 'linked_guardian_users',
              'student_count', coverage.eligible_student_count,
              'source_dashboard', $6::text
            )
          FROM coverage
          CROSS JOIN batch
          WHERE coverage.requested_student_count > 0
            AND coverage.eligible_student_count = coverage.requested_student_count
            AND coverage.covered_student_count = coverage.eligible_student_count
          RETURNING id, entity_id
        ), inserted_staff_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body,
            status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'accountant-fee-follow-up-' || event.id::text || '-' || role_name,
            role_name,
            $5,
            'Fee arrears guardian follow-up queued',
            coverage.eligible_student_count::text || ' learner fee reminder(s) were queued for exact linked guardians.',
            'unread',
            'normal',
            'accountant-command',
            event.id::text,
            jsonb_build_object(
              'event_id', event.id::text,
              'recipient_scope', 'authorized_staff_summary',
              'student_count', coverage.eligible_student_count,
              'source_dashboard', $6::text
            )
          FROM inserted_event event
          CROSS JOIN coverage
          CROSS JOIN unnest($7::text[]) AS role_name
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), inserted_guardian_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'accountant-fee-follow-up-' || event.id::text || '-' || guardian.guardian_id::text || '-' || student.student_id::text,
            guardian.user_id,
            guardian.guardian_id,
            $5,
            'Fee balance follow-up: ' || student.student_name,
            student.student_name || ' has an outstanding school fee balance. Please review the fee statement in the parent portal or contact the accounts office.',
            'unread',
            'high',
            'accountant-command',
            event.id::text,
            jsonb_build_object(
              'event_id', event.id::text,
              'student_id', student.student_id::text,
              'recipient_scope', 'linked_guardian_users',
              'source_dashboard', $6::text
            )
          FROM inserted_event event
          CROSS JOIN eligible_students student
          INNER JOIN linked_guardians guardian
            ON guardian.student_id = student.student_id
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_guardian_id = EXCLUDED.recipient_guardian_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            priority = EXCLUDED.priority,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), action_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $2::uuid,
            current_setting('app.request_id', true),
            $5,
            'student_arrears_batch',
            event.id,
            jsonb_build_object(
              'student_ids', to_jsonb($3::uuid[]),
              'guardian_notification_count', (SELECT COUNT(*) FROM inserted_guardian_notifications),
              'staff_notification_count', (SELECT COUNT(*) FROM inserted_staff_notifications),
              'recipient_scope', 'linked_guardian_users'
            )
          FROM inserted_event event
          RETURNING id
        )
        SELECT
          coverage.requested_student_count,
          coverage.eligible_student_count,
          coverage.covered_student_count,
          (SELECT COUNT(*)::int FROM inserted_guardian_notifications) AS guardian_notification_count,
          (SELECT COUNT(*)::int FROM inserted_staff_notifications) AS staff_notification_count,
          (SELECT id::text FROM inserted_event LIMIT 1) AS event_id
        FROM coverage
      `,
      [
        tenantId,
        actorUserId,
        studentIds,
        JSON.stringify(FEE_FOLLOW_UP_STAFF_ROLES),
        `accountant.${dto.action}`,
        dto.source_dashboard,
        [...FEE_FOLLOW_UP_STAFF_ROLES],
      ],
    );

    const delivery = result.rows[0];
    if (!delivery || Number(delivery.eligible_student_count) !== studentIds.length) {
      throw new BadRequestException('Every selected learner must be an active arrears account in this school');
    }
    if (Number(delivery.covered_student_count) !== studentIds.length) {
      throw new BadRequestException('Every selected learner must have an active linked guardian account before reminders can be queued');
    }
    const guardianNotificationCount = Number(delivery.guardian_notification_count ?? 0);
    if (!delivery.event_id || guardianNotificationCount < studentIds.length) {
      throw new BadRequestException('Guardian fee reminders could not be queued for every selected learner');
    }

    return {
      success: true,
      message: `${guardianNotificationCount} guardian reminder${guardianNotificationCount === 1 ? '' : 's'} queued for ${studentIds.length} learner${studentIds.length === 1 ? '' : 's'}.`,
      delivery: {
        event_id: delivery.event_id,
        student_count: studentIds.length,
        guardian_notification_count: guardianNotificationCount,
        staff_notification_count: Number(delivery.staff_notification_count ?? 0),
        recipient_scope: 'linked_guardian_users',
      },
    };
  }
}
