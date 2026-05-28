import { Injectable } from '@nestjs/common';

import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable()
export class OperationalWorkflowCompletedConsumer
  implements EventConsumerDescriptor<'workflow.action.completed'>
{
  readonly name = 'workflow-action-completed.audit';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    await this.auditLogsRepository.createAuditLog({
      tenant_id: event.tenant_id,
      actor_user_id: typeof event.headers.user_id === 'string' ? event.headers.user_id : null,
      request_id:
        typeof event.headers.request_id === 'string'
          ? event.headers.request_id
          : event.payload.command_id,
      action: 'workflow.action.completed',
      resource_type: event.aggregate_type,
      resource_id: event.aggregate_id,
      metadata: {
        consumer: this.name,
        event_id: event.id,
        event_key: event.event_key,
        dashboard_id: event.payload.dashboard_id,
        node_id: event.payload.node_id,
        action_id: event.payload.action_id,
        workflow_id: event.payload.workflow_id,
        logical_aggregate_id: event.payload.aggregate_id,
        execution_handler: event.payload.execution_handler,
        emitted_events: event.payload.emitted_events,
        audit_action: event.payload.audit_action,
        status: event.payload.status,
        payload: event.payload.payload,
      },
    });
  }
}
