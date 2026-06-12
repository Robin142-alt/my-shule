import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkCompleteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-complete.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-complete' && event.payload.action_id !== 'mark-complete') {
      return;
    }

    // TODO: Implement domain logic for mark-complete
    console.log('[MarkCompleteConsumer] Executing action:', event.payload);
  }
}
