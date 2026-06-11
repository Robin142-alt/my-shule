import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { WorkflowRepository } from '../repositories/workflow.repository';

@Injectable()
export class BoardingEventConsumer implements EventConsumerDescriptor<'boarding.request.submitted'> {
  readonly name = 'boarding-event.workflow';
  readonly event_name = 'boarding.request.submitted' as const;

  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async handle(event: DomainEvent<'boarding.request.submitted'>): Promise<void> {
    const payload = event.payload;
    
    await this.workflowRepository.createTask({
      tenant_id: event.tenant_id,
      task_key: `boarding-request-${payload.request_id}`,
      assigned_to_role: 'BOARDING_MASTER',
      created_by_user_id: payload.requested_by_user_id,
      title: 'New Boarding Request',
      description: `Student ${payload.student_id} has a new boarding request. Reason: ${payload.reason}`,
      module: 'boarding',
      record_id: payload.request_id,
      priority: 'normal',
    });

    await this.workflowRepository.createNotification({
      tenant_id: event.tenant_id,
      notification_key: `boarding-request-notification-${payload.request_id}`,
      recipient_role: 'BOARDING_MASTER',
      type: 'BOARDING_REQUEST',
      title: 'New Boarding Request Submitted',
      body: `A new boarding request has been submitted for student ${payload.student_id}.`,
      source_module: 'boarding',
      source_record_id: payload.request_id,
    });
  }
}
