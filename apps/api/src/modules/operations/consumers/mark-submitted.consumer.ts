import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkSubmittedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-submitted.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-submitted' && event.payload.action_id !== 'mark-submitted') {
      return;
    }

    // TODO: Implement domain logic for mark-submitted
    console.log('[MarkSubmittedConsumer] Executing action:', event.payload);
  }
}
