import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationRouterService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(tenantId: string, userId: string, role: string) {
    const result = await this.executeSql(
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
    const result = await this.executeSql(
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
    const result = await this.executeSql(
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
    await this.executeSql(
      `
      UPDATE notifications 
      SET status = 'read', read_at = NOW() 
      WHERE tenant_id = $1 AND id = $2
      `,
      [tenantId, notificationId]
    );
  }

  async markTaskCompleted(tenantId: string, taskId: string) {
    await this.executeSql(
      `
      UPDATE tasks 
      SET status = 'COMPLETED', completed_at = NOW() 
      WHERE tenant_id = $1 AND id = $2
      `,
      [tenantId, taskId]
    );
  }
}
