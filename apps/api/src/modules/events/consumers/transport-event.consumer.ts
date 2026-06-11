import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { WorkflowRepository } from '../repositories/workflow.repository';

@Injectable()
export class TransportEventConsumer implements EventConsumerDescriptor<'transport.request.submitted'> {
  readonly name = 'transport-event.workflow';
  readonly event_name = 'transport.request.submitted' as const;

  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async handle(event: DomainEvent<'transport.request.submitted'>): Promise<void> {
    const payload = event.payload;
    
    await this.workflowRepository.createTask({
      tenant_id: event.tenant_id,
      task_key: `transport-request-${payload.request_id}`,
      assigned_to_role: 'TRANSPORT_MANAGER',
      created_by_user_id: payload.requested_by_user_id,
      title: 'New Transport Request',
      description: `Student ${payload.student_id} requires transport on route ${payload.route_id || 'unassigned'}.`,
      module: 'transport',
      record_id: payload.request_id,
      priority: 'normal',
    });

    await this.workflowRepository.createNotification({
      tenant_id: event.tenant_id,
      notification_key: `transport-request-notification-${payload.request_id}`,
      recipient_role: 'TRANSPORT_MANAGER',
      type: 'TRANSPORT_REQUEST',
      title: 'New Transport Request Submitted',
      body: `A new transport request has been submitted for student ${payload.student_id}.`,
      source_module: 'transport',
      source_record_id: payload.request_id,
    });
  }
}
