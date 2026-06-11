import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class WorkflowRepository {
  constructor(private readonly databaseService: DatabaseService) {}

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
  }): Promise<void> {
    await this.databaseService.query(
      `
      INSERT INTO notifications (
        tenant_id, notification_key, recipient_user_id, recipient_role,
        type, title, body, priority, source_module, source_record_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      ]
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
    await this.databaseService.query(
      `
      INSERT INTO tasks (
        tenant_id, task_key, assigned_to_user_id, assigned_to_role,
        created_by_user_id, title, description, module, record_id, priority, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    await this.databaseService.query(
      `
      INSERT INTO approval_requests (
        tenant_id, approval_key, requested_by_user_id, approver_role, approver_user_id,
        module, record_id, approval_type, reason, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
