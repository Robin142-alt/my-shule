import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { WorkflowRepository } from '../repositories/workflow.repository';

@Injectable()
export class ProcurementEventConsumer implements EventConsumerDescriptor<'procurement.request.submitted'> {
  readonly name = 'procurement-event.workflow';
  readonly event_name = 'procurement.request.submitted' as const;

  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async handle(event: DomainEvent<'procurement.request.submitted'>): Promise<void> {
    const payload = event.payload;
    
    // Approval required for requests over 50,000 (example threshold)
    const requiresApproval = payload.estimated_cost >= 50000;
    
    if (requiresApproval) {
      await this.workflowRepository.createApprovalRequest({
        tenant_id: event.tenant_id,
        approval_key: `procurement-approval-${payload.request_id}`,
        requested_by_user_id: payload.requested_by_user_id,
        approver_role: 'HOD', // Or Principal depending on amount
        module: 'procurement',
        record_id: payload.request_id,
        approval_type: 'PROCUREMENT',
        reason: `Request for ${payload.quantity} ${payload.item_name} (Estimated Cost: ${payload.estimated_cost})`,
      });
      
      await this.workflowRepository.createNotification({
        tenant_id: event.tenant_id,
        notification_key: `procurement-approval-notification-${payload.request_id}`,
        recipient_role: 'HOD',
        type: 'PROCUREMENT_APPROVAL_REQUIRED',
        title: 'Procurement Request Requires Approval',
        body: `A request for ${payload.item_name} requires your approval.`,
        source_module: 'procurement',
        source_record_id: payload.request_id,
      });
    }

    await this.workflowRepository.createTask({
      tenant_id: event.tenant_id,
      task_key: `procurement-request-${payload.request_id}`,
      assigned_to_role: 'STOREKEEPER',
      created_by_user_id: payload.requested_by_user_id,
      title: 'New Procurement Request',
      description: `Request for ${payload.quantity} ${payload.item_name}.`,
      module: 'procurement',
      record_id: payload.request_id,
      priority: requiresApproval ? 'high' : 'normal',
    });
  }
}
