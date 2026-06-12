import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WidgetProvider, WidgetContext, WidgetPayload } from '../../../common/widget-registry/widget-registry.interfaces';
import { WidgetRegistryService } from '../../../common/widget-registry/widget-registry.service';

@Injectable()
export class ActivityWidgetProvider implements WidgetProvider, OnModuleInit {
  widget_id = 'activity_feed';
  capabilities = [];
  allowed_roles = [];
  event_subscriptions = [];
  fallback_behavior: 'HIDE' | 'DEGRADE' | 'SHOW_ERROR' = 'HIDE';
  failure_policy: 'CONTINUE' | 'ABORT' = 'CONTINUE';

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: WidgetRegistryService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async resolve(context: WidgetContext): Promise<WidgetPayload> {
    const res = await this.prisma.query('SELECT action, metadata, created_at FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5', [context.tenantId]).catch(() => ({ rows: [] }));
    
    const activities = res.rows.map((row: any) => ({
      id: Math.random().toString(36).substring(7),
      type: 'action',
      title: row.action || 'System Action',
      time: new Date(row.created_at).toISOString(),
    }));

    return {
      widget_id: this.widget_id,
      state: activities.length > 0 ? 'ACTIVE' : 'EMPTY',
      data: activities,
    };
  }
}
