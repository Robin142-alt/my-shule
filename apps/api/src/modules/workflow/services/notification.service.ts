import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface NotifyRolesInput {
  schoolId: string;
  targetRoles: string[];
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export interface NotifyUserInput {
  schoolId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
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

  constructor(private readonly prisma: PrismaService, private readonly db: PrismaService) {}

  async notifyRoles(input: NotifyRolesInput) {
    // In a real system, you might look up the user IDs that have this role in this school.
    // For now, we store the target_role, and the frontend queries by user's role.
    const promises = input.targetRoles.map((role) =>
      this.db.query(
        `INSERT INTO notifications (
          tenant_id, target_role, title, message, type, priority, entity_type, entity_id, action_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          input.schoolId,
          role,
          input.title,
          input.message,
          input.type,
          input.priority || 'normal',
          input.entityType || null,
          input.entityId || null,
          input.actionUrl || null,
        ]
      )
    );

    const results = await Promise.all(promises);
    return results.map(r => r.rows[0]);
  }

  async notifyUser(input: NotifyUserInput) {
    const result = await this.db.query(
      `INSERT INTO notifications (
        tenant_id, user_id, title, message, type, priority, entity_type, entity_id, action_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        input.schoolId,
        input.userId,
        input.title,
        input.message,
        input.type,
        input.priority || 'normal',
        input.entityType || null,
        input.entityId || null,
        input.actionUrl || null,
      ]
    );

    return result.rows[0];
  }
}
