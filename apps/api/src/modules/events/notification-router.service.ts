import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class NotificationRouterService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getUserNotifications(tenantId: string, userId: string, role: string) {
    const result = await this.databaseService.query(
      `
      SELECT * FROM notifications 
      WHERE tenant_id = $1 
      AND (recipient_user_id = $2 OR recipient_role = $3)
      ORDER BY created_at DESC 
      LIMIT 50
      `,
      [tenantId, userId, role]
    );
    return result.rows;
  }

  async getUserTasks(tenantId: string, userId: string, role: string) {
    const result = await this.databaseService.query(
      `
      SELECT * FROM tasks 
      WHERE tenant_id = $1 
      AND (assigned_to_user_id = $2 OR assigned_to_role = $3)
      AND status = 'OPEN'
      ORDER BY created_at DESC 
      LIMIT 50
      `,
      [tenantId, userId, role]
    );
    return result.rows;
  }

  async getPendingApprovals(tenantId: string, userId: string, role: string) {
    const result = await this.databaseService.query(
      `
      SELECT * FROM approval_requests 
      WHERE tenant_id = $1 
      AND (approver_user_id = $2 OR approver_role = $3)
      AND status = 'PENDING'
      ORDER BY created_at DESC 
      LIMIT 50
      `,
      [tenantId, userId, role]
    );
    return result.rows;
  }

  async markNotificationRead(tenantId: string, notificationId: string) {
    await this.databaseService.query(
      `
      UPDATE notifications 
      SET status = 'read', read_at = NOW() 
      WHERE tenant_id = $1 AND id = $2
      `,
      [tenantId, notificationId]
    );
  }

  async markTaskCompleted(tenantId: string, taskId: string) {
    await this.databaseService.query(
      `
      UPDATE tasks 
      SET status = 'COMPLETED', completed_at = NOW() 
      WHERE tenant_id = $1 AND id = $2
      `,
      [tenantId, taskId]
    );
  }
}
