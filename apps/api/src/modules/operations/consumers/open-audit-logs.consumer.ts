import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenAuditLogsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-audit-logs.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-audit-logs' && event.payload.action_id !== 'open-audit-logs') {
      return;
    }

    // TODO: Implement domain logic for open-audit-logs
    console.log('[OpenAuditLogsConsumer] Executing action:', event.payload);
  }
}
