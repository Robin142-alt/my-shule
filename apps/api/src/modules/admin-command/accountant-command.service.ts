import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

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

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    try {
      return await this.prisma.query<T>(query, params);
    } catch (e) {
      return { rows: [], rowCount: 0 };
    }
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
    const res = await this.executeSql(
      `SELECT * FROM finance_expenses WHERE tenant_id = $1 ORDER BY expense_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async recordAction(dto: any) {
    const tenantId = this.requireTenantId();
    const store = this.requestContext.getStore();
    const action = String(dto?.action || 'finance_action').trim().replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    const title = String(dto?.title || 'Finance workflow saved').trim().slice(0, 160);
    const message = String(dto?.message || 'A finance workflow action was saved.').trim().slice(0, 500);
    const entityType = String(dto?.entity_type || 'finance_workflow').trim().slice(0, 80);
    const entityId = dto?.entity_id ? String(dto.entity_id).trim().slice(0, 120) : null;
    const targetRoles = Array.isArray(dto?.target_roles) ? dto.target_roles.map(String) : ['accountant', 'principal'];
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
}
