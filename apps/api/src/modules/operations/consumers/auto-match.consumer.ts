import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AutoMatchConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'auto-match.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'auto-match' && event.payload.action_id !== 'auto-match') {
      return;
    }

    // TODO: Implement domain logic for auto-match
    console.log('[AutoMatchConsumer] Executing action:', event.payload);
  }
}
