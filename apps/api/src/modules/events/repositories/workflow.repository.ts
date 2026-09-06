import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class WorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async executeSql<T = any>(query: string, params: any[] = [], tx?: any): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    if (typeof firstParam !== 'string' || !firstParam.trim()) {
      throw new Error('A tenant key is required for workflow projection writes');
    }
    if (tx) {
      const rows = await tx.$queryRawUnsafe(query, ...params);
      return { rows, rowCount: rows.length };
    }
    if (typeof firstParam === 'string' && firstParam.trim()) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    }

    throw new Error('A tenant key is required for workflow projection writes');
  }

  async createNotification(params: {
    tenant_id: string;
    notification_key: string;
    recipient_user_id?: string;
    recipient_role?: string;
    type: string;
    title: string;
    body: string;
    priority?: string;
    source_module?: string;
    source_record_id?: string;
    metadata?: Record<string, unknown>;
  }, tx?: any): Promise<void> {
    await this.executeSql(
      `
      INSERT INTO notifications (
        tenant_id, notification_key, recipient_user_id, recipient_role,
        type, title, body, priority, source_module, source_record_id, metadata
      ) VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      ON CONFLICT (tenant_id, notification_key) DO NOTHING
      `,
      [
        params.tenant_id,
        params.notification_key,
        params.recipient_user_id || null,
        params.recipient_role || null,
        params.type,
        params.title,
        params.body,
        params.priority || 'normal',
        params.source_module || null,
        params.source_record_id || null,
        params.metadata ? JSON.stringify(params.metadata) : '{}',
      ], tx
    );
  }

  async createTask(params: {
    tenant_id: string;
    task_key: string;
    assigned_to_user_id?: string;
    assigned_to_role?: string;
    created_by_user_id?: string;
    title: string;
    description?: string;
    module?: string;
    record_id?: string;
    priority?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.executeSql(
      `
      INSERT INTO tasks (
        tenant_id, task_key, assigned_to_user_id, assigned_to_role,
        created_by_user_id, title, description, module, record_id, priority, metadata
      ) VALUES ($1, $2, $3::uuid, $4, $5::uuid, $6, $7, $8, $9, $10, $11::jsonb)
      ON CONFLICT (tenant_id, task_key) DO NOTHING
      `,
      [
        params.tenant_id,
        params.task_key,
        params.assigned_to_user_id || null,
        params.assigned_to_role || null,
        params.created_by_user_id || null,
        params.title,
        params.description || null,
        params.module || null,
        params.record_id || null,
        params.priority || 'normal',
        params.metadata ? JSON.stringify(params.metadata) : '{}',
      ]
    );
  }

  async createApprovalRequest(params: {
    tenant_id: string;
    approval_key: string;
    requested_by_user_id?: string;
    approver_role?: string;
    approver_user_id?: string;
    module?: string;
    record_id?: string;
    approval_type?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.executeSql(
      `
      INSERT INTO dashboard_approval_requests (
        tenant_id, approval_key, requested_by_user_id, approver_role, approver_user_id,
        module, record_id, approval_type, reason, metadata
      ) VALUES ($1, $2, $3::uuid, $4, $5::uuid, $6, $7, $8, $9, $10::jsonb)
      ON CONFLICT (tenant_id, approval_key) DO NOTHING
      `,
      [
        params.tenant_id,
        params.approval_key,
        params.requested_by_user_id || null,
        params.approver_role || null,
        params.approver_user_id || null,
        params.module || null,
        params.record_id || null,
        params.approval_type || null,
        params.reason || null,
        params.metadata ? JSON.stringify(params.metadata) : '{}',
      ]
    );
  }
}
