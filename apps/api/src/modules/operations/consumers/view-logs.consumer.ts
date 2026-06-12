import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewLogsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-logs.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-logs' && event.payload.action_id !== 'view-logs') {
      return;
    }

    // TODO: Implement domain logic for view-logs
    console.log('[ViewLogsConsumer] Executing action:', event.payload);
  }
}
