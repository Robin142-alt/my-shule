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
      title: 'New practical request',
      description: `A practical lesson request needs review for ${payload.date_needed}.`,
      module: 'laboratory',
      record_id: payload.request_id,
      priority: 'normal',
    });

    await this.workflowRepository.createNotification({
      tenant_id: event.tenant_id,
      notification_key: `lab-request-notification-${payload.request_id}`,
      recipient_role: 'LAB_TECHNICIAN',
      type: 'LAB_REQUEST',
      title: 'New practical request',
      body: 'A teacher submitted a practical lesson request for laboratory review.',
      source_module: 'laboratory',
      source_record_id: payload.request_id,
    });
  }
}
