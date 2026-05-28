import { Injectable } from '@nestjs/common';

import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { EventPublisherService } from '../event-publisher.service';

@Injectable()
export class OperationalWorkflowExecutionConsumer
  implements EventConsumerDescriptor<'workflow.action.dispatched'>
{
  readonly name = 'workflow-action-dispatched.execution';
  readonly event_name = 'workflow.action.dispatched' as const;

  constructor(private readonly eventPublisher: EventPublisherService) {}

  async handle(event: DomainEvent<'workflow.action.dispatched'>): Promise<void> {
    const completedAt = new Date().toISOString();

    await this.eventPublisher.publish({
      event_key: `workflow.action.completed:${event.tenant_id}:${event.payload.command_id}:${event.payload.action_id}`,
      event_name: 'workflow.action.completed',
      aggregate_type: 'operational_workflow',
      aggregate_id: event.aggregate_id,
      payload: {
        tenant_id: event.tenant_id,
        command_id: event.payload.command_id,
        dashboard_id: event.payload.dashboard_id,
        role: event.payload.role,
        node_id: event.payload.node_id,
        action_id: event.payload.action_id,
        workflow_id: event.payload.workflow_id,
        execution_handler: event.payload.execution_handler,
        aggregate_id: event.payload.aggregate_id,
        completed_at: completedAt,
        emitted_events: [...event.payload.emitted_events],
        audit_action: event.payload.audit_action,
        status: 'COMPLETED',
        payload: event.payload.payload,
      },
      headers: {
        causation_event_id: event.id,
        operational_action_id: event.payload.action_id,
        workflow_id: event.payload.workflow_id,
        dashboard_id: event.payload.dashboard_id,
      },
    });
  }
}
