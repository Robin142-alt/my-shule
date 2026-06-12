import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-log' && event.payload.action_id !== 'view-log') {
      return;
    }

    // TODO: Implement domain logic for view-log
    console.log('[ViewLogConsumer] Executing action:', event.payload);
  }
}
