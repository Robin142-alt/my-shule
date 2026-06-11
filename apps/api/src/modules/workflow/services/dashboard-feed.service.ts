import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

export interface GetDashboardFeedInput {
  schoolId: string;
  userId: string;
  role: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class DashboardFeedService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardFeed(input: GetDashboardFeedInput) {
    const limit = input.limit || 20;
    const offset = input.offset || 0;

    // A feed is an aggregation of workflow events, tasks, and notifications relevant to this user/role.
    // We can query the workflow_events table where target_roles contains the user's role.
    const result = await this.db.query(
      `SELECT * FROM workflow_events 
       WHERE tenant_id = $1 
         AND target_roles @> $2::jsonb 
       ORDER BY created_at DESC 
       LIMIT $3 OFFSET $4`,
      [input.schoolId, JSON.stringify([input.role]), limit, offset]
    );

    return result.rows;
  }

  async getDashboardSummary(input: GetDashboardFeedInput) {
    // Returns counts for badges
    const [tasks, notifications, approvals] = await Promise.all([
      this.db.query(
        `SELECT COUNT(*) FROM dashboard_tasks WHERE tenant_id = $1 AND target_role = $2 AND status = 'open'`,
        [input.schoolId, input.role]
      ),
      this.db.query(
        `SELECT COUNT(*) FROM notifications WHERE tenant_id = $1 AND (user_id = $2 OR target_role = $3) AND is_read = false`,
        [input.schoolId, input.userId, input.role]
      ),
      this.db.query(
        `SELECT COUNT(*) FROM approval_requests WHERE tenant_id = $1 AND approver_roles @> $2::jsonb AND status = 'pending'`,
        [input.schoolId, JSON.stringify([input.role])]
      )
    ]);

    return {
      openTasks: parseInt(tasks.rows[0].count, 10),
      unreadNotifications: parseInt(notifications.rows[0].count, 10),
      pendingApprovals: parseInt(approvals.rows[0].count, 10),
    };
  }
}
