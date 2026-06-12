import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ManualMatchConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'manual-match.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'manual-match' && event.payload.action_id !== 'manual-match') {
      return;
    }

    // TODO: Implement domain logic for manual-match
    console.log('[ManualMatchConsumer] Executing action:', event.payload);
  }
}
