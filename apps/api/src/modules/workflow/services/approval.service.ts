import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

export interface CreateApprovalRequestInput {
  schoolId: string;
  requestedByUserId: string;
  requestedByRole: string;
  approverRoles: string[];
  approvalType: string;
  entityType: string;
  entityId: string;
  title: string;
  reason?: string;
  payload?: any;
}

export interface ApproveRequestInput {
  schoolId: string;
  approvalId: string;
  approvedByUserId: string;
  comment?: string;
}

export interface RejectRequestInput {
  schoolId: string;
  approvalId: string;
  rejectedByUserId: string;
  reason?: string;
}

@Injectable()
export class ApprovalService {
  constructor(private readonly db: DatabaseService) {}

  async createApprovalRequest(input: CreateApprovalRequestInput) {
    const result = await this.db.query(
      `INSERT INTO approval_requests (
        tenant_id, requested_by_user_id, requested_by_role, approver_roles,
        approval_type, entity_type, entity_id, title, reason, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        input.schoolId,
        input.requestedByUserId,
        input.requestedByRole,
        JSON.stringify(input.approverRoles),
        input.approvalType,
        input.entityType,
        input.entityId,
        input.title,
        input.reason || null,
        input.payload ? JSON.stringify(input.payload) : '{}',
      ]
    );

    return result.rows[0];
  }

  async approveRequest(input: ApproveRequestInput) {
    const result = await this.db.query(
      `UPDATE approval_requests 
       SET status = 'approved', approved_by_user_id = $2, comment = $3, updated_at = NOW() 
       WHERE id = $1 AND tenant_id = $4
       RETURNING *`,
      [input.approvalId, input.approvedByUserId, input.comment || null, input.schoolId]
    );

    return result.rows[0];
  }

  async rejectRequest(input: RejectRequestInput) {
    const result = await this.db.query(
      `UPDATE approval_requests 
       SET status = 'rejected', approved_by_user_id = $2, comment = $3, updated_at = NOW() 
       WHERE id = $1 AND tenant_id = $4
       RETURNING *`,
      [input.approvalId, input.rejectedByUserId, input.reason || null, input.schoolId]
    );

    return result.rows[0];
  }
}
