import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WidgetProvider, WidgetContext, WidgetPayload } from '../../../common/widget-registry/widget-registry.interfaces';
import { WidgetRegistryService } from '../../../common/widget-registry/widget-registry.service';

@Injectable()
export class FinanceWidgetProvider implements WidgetProvider, OnModuleInit {
  widget_id = 'finance_summary';
  capabilities = ['finance:read'];
  allowed_roles = [];
  event_subscriptions = [];
  fallback_behavior: 'HIDE' | 'DEGRADE' | 'SHOW_ERROR' = 'DEGRADE';
  failure_policy: 'CONTINUE' | 'ABORT' = 'CONTINUE';

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: WidgetRegistryService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async resolve(context: WidgetContext): Promise<WidgetPayload> {
    const [collectedRes, invoicesRes, sparklineRes] = await Promise.all([
      this.prisma.query('SELECT SUM(amount_minor) as total_collected FROM manual_fee_payments WHERE tenant_id = $1 AND DATE(created_at) = CURRENT_DATE', [context.tenantId]).catch(() => ({ rows: [] })),
      this.prisma.query('SELECT SUM(balance_minor) as outstanding FROM invoices WHERE tenant_id = $1 AND status != \'paid\'', [context.tenantId]).catch(() => ({ rows: [] })),
      this.prisma.query(`
        SELECT DATE(created_at) as day_date, SUM(amount_minor) as daily_total
        FROM manual_fee_payments WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC
      `, [context.tenantId]).catch(() => ({ rows: [] }))
    ]);

    const collectionsTodayMinor = parseInt(collectedRes.rows[0]?.total_collected || '0', 10);
    const collectionsToday = `KES ${(collectionsTodayMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    
    const outstandingMinor = parseInt(invoicesRes.rows[0]?.outstanding || '0', 10);
    const outstandingInvoices = `KES ${(outstandingMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const sparkline = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sparklineRes.rows.forEach((row: any) => {
      const d = new Date(row.day_date);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        sparkline[6 - diffDays] = parseInt(row.daily_total || '0', 10) / 100;
      }
    });

    let trend = 0;
    if (sparkline[5] > 0) {
      trend = Math.round(((sparkline[6] - sparkline[5]) / sparkline[5]) * 100);
    }
    const trendDirection = trend >= 0 ? 'up' : 'down';
    const trendLabel = trend > 0 ? `+${trend}%` : `${trend}%`;

    return {
      widget_id: this.widget_id,
      state: 'ACTIVE',
      data: {
        collectionsToday,
        outstandingInvoices,
        sparkline,
        trendDirection,
        trendLabel,
      }
    };
  }
}
