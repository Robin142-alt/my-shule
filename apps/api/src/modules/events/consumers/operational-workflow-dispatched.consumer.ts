import { Injectable } from '@nestjs/common';

import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable()
export class OperationalWorkflowDispatchedConsumer
  implements EventConsumerDescriptor<'workflow.action.dispatched'>
{
  readonly name = 'workflow-action-dispatched.audit';
  readonly event_name = 'workflow.action.dispatched' as const;

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async handle(event: DomainEvent<'workflow.action.dispatched'>): Promise<void> {
    await this.auditLogsRepository.createAuditLog({
      tenant_id: event.tenant_id,
      actor_user_id:
        typeof event.headers.user_id === 'string'
          ? event.headers.user_id
          : event.payload.requested_by_user_id,
      request_id:
        typeof event.headers.request_id === 'string'
          ? event.headers.request_id
          : event.payload.command_id,
      action: 'workflow.action.dispatched',
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
        fallback_handler: event.payload.fallback_handler,
        retry_policy: event.payload.retry_policy,
        emitted_events: event.payload.emitted_events,
        audit_action: event.payload.audit_action,
        payload: event.payload.payload,
      },
    });
  }
}
