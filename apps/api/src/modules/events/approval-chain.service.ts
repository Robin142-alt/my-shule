import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EventPublisherService } from './event-publisher.service';

export interface ApprovalChainHierarchy {
  [role: string]: string | null;
}

@Injectable()
export class ApprovalChainService {
  // Role Hierarchy Mapping: Role -> Approver Role
  private readonly roleHierarchy: ApprovalChainHierarchy = {
    TEACHER: 'HOD',
    HOD: 'DEPUTY_PRINCIPAL',
    DEPUTY_PRINCIPAL: 'PRINCIPAL',
    STOREKEEPER: 'HOD',
    ACCOUNTANT: 'BURSAR',
    BURSAR: 'PRINCIPAL',
    NURSE: 'DEPUTY_PRINCIPAL',
    COUNSELLOR: 'DEPUTY_PRINCIPAL',
    BOARDING_MASTER: 'DEPUTY_PRINCIPAL',
    TRANSPORT_MANAGER: 'DEPUTY_PRINCIPAL',
    LAB_TECHNICIAN: 'HOD',
    PRINCIPAL: null, // Top of the chain
    SUPER_ADMIN: null,
  };

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  getApproverRole(role: string): string | null {
    const normalizedRole = role.toUpperCase();
    return this.roleHierarchy[normalizedRole] || null;
  }

  async processApproval(params: {
    tenant_id: string;
    approval_id: string;
    approver_user_id: string;
    approver_role: string;
    decision: 'APPROVED' | 'REJECTED';
    decision_note?: string;
  }): Promise<void> {
    const { tenant_id, approval_id, approver_user_id, approver_role, decision, decision_note } = params;

    const result = await this.databaseService.query(
      `
      UPDATE approval_requests
      SET status = $1,
          decided_at = NOW(),
          decision_note = $2,
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4 AND status = 'PENDING'
      RETURNING *;
      `,
      [decision, decision_note || null, approval_id, tenant_id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Pending approval request not found');
    }

    const request = result.rows[0];

    // Emit event based on decision
    await this.eventPublisher.publish({
      event_key: `workflow.action.dispatched:${tenant_id}:${approval_id}`,
      event_name: 'workflow.action.dispatched',
      aggregate_type: 'operational_workflow',
      aggregate_id: approval_id,
      payload: {
        tenant_id,
        command_id: approval_id,
        dashboard_id: `${approver_role}-dashboard`,
        role: approver_role,
        node_id: 'approval-action',
        action_id: `approval-${decision.toLowerCase()}`,
        workflow_id: 'approval-workflow',
        execution_handler: 'ApprovalExecutionHandler',
        fallback_handler: 'DefaultFallbackHandler',
        retry_policy: {
          maxAttempts: 3,
          backoff: 'exponential',
        },
        emitted_events: [`approval.request.${decision.toLowerCase()}`],
        audit_action: `Approval request ${decision.toLowerCase()} for ${request.module}`,
        aggregate_id: approval_id,
        requested_by_user_id: approver_user_id,
        requested_at: new Date().toISOString(),
        payload: {
          approval_id,
          module: request.module,
          record_id: request.record_id,
          decision,
          decision_note,
        },
      },
    });

    // Also update notification
    await this.databaseService.query(
      `
      UPDATE notifications
      SET status = 'read',
          read_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = $1 AND source_record_id = $2 AND type LIKE '%APPROVAL%'
      `,
      [tenant_id, request.record_id]
    );
  }
}
