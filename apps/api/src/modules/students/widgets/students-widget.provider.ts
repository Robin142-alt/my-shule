import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WidgetProvider, WidgetContext, WidgetPayload } from '../../../common/widget-registry/widget-registry.interfaces';
import { WidgetRegistryService } from '../../../common/widget-registry/widget-registry.service';

@Injectable()
export class StudentsWidgetProvider implements WidgetProvider, OnModuleInit {
  widget_id = 'students_summary';
  capabilities = ['students:read'];
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
    const [countRes, sparklineRes] = await Promise.all([
      this.prisma.query('SELECT COUNT(*) as count FROM students WHERE tenant_id = $1', [context.tenantId]),
      this.prisma.query(`
        SELECT DATE(created_at) as day_date, COUNT(id) as daily_count
        FROM students WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC
      `, [context.tenantId]).catch(() => ({ rows: [] }))
    ]);

    const totalStudents = parseInt(countRes.rows[0]?.count || '0', 10);
    
    // Compute sparkline data logic (could be improved, but mimics legacy exactly)
    const sparkline = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sparklineRes.rows.forEach((row: any) => {
      const d = new Date(row.day_date);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        sparkline[6 - diffDays] = parseInt(row.daily_count || '0', 10);
      }
    });

    return {
      widget_id: this.widget_id,
      state: 'ACTIVE',
      data: {
        totalStudents,
        sparkline,
      }
    };
  }
}
