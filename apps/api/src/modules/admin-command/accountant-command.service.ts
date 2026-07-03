import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

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
