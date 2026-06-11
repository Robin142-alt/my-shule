import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { WorkflowRepository } from '../repositories/workflow.repository';

@Injectable()
export class LabEventConsumer implements EventConsumerDescriptor<'lab.request.submitted'> {
  readonly name = 'lab-event.workflow';
  readonly event_name = 'lab.request.submitted' as const;

  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async handle(event: DomainEvent<'lab.request.submitted'>): Promise<void> {
    const payload = event.payload;
    
    await this.workflowRepository.createTask({
      tenant_id: event.tenant_id,
      task_key: `lab-request-${payload.request_id}`,
      assigned_to_role: 'LAB_TECHNICIAN',
      created_by_user_id: payload.requested_by_user_id,
      title: 'New Lab Equipment Request',
      description: `Equipment ${payload.equipment_id} requested for ${payload.date_needed}.`,
      module: 'lab',
      record_id: payload.request_id,
      priority: 'normal',
    });

    await this.workflowRepository.createNotification({
      tenant_id: event.tenant_id,
      notification_key: `lab-request-notification-${payload.request_id}`,
      recipient_role: 'LAB_TECHNICIAN',
      type: 'LAB_REQUEST',
      title: 'New Lab Equipment Request',
      body: `A new request for lab equipment has been submitted.`,
      source_module: 'lab',
      source_record_id: payload.request_id,
    });
  }
}
