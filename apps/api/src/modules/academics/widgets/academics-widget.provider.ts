import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WidgetProvider, WidgetContext, WidgetPayload } from '../../../common/widget-registry/widget-registry.interfaces';
import { WidgetRegistryService } from '../../../common/widget-registry/widget-registry.service';

@Injectable()
export class AcademicsWidgetProvider implements WidgetProvider, OnModuleInit {
  widget_id = 'academics_summary';
  capabilities = ['academics:read'];
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
    const [gradingRes, nextExamRes] = await Promise.all([
      this.prisma.query('SELECT COUNT(*) as count FROM academics_assignments WHERE tenant_id = $1 AND due_date < CURRENT_DATE', [context.tenantId]).catch(() => ({ rows: [] })),
      this.prisma.query('SELECT title, due_date FROM academics_assignments WHERE tenant_id = $1 AND due_date >= CURRENT_DATE ORDER BY due_date ASC LIMIT 1', [context.tenantId]).catch(() => ({ rows: [] })),
    ]);

    const gradingQueueCount = parseInt(gradingRes.rows[0]?.count || '0', 10);
    
    let nextExamStr = 'No upcoming exams';
    if (nextExamRes.rows.length > 0) {
      const nextDate = new Date(nextExamRes.rows[0].due_date);
      const diffTime = Math.abs(nextDate.getTime() - new Date().getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      nextExamStr = `${nextExamRes.rows[0].title} (${diffDays} days)`;
    }

    return {
      widget_id: this.widget_id,
      state: 'ACTIVE',
      data: {
        gradingQueueCount,
        nextExamStr,
      }
    };
  }
}
