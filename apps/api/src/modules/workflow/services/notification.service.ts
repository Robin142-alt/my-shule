import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

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
  constructor(private readonly db: DatabaseService) {}

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
