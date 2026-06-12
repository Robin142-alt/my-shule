import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkMissingConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-missing.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-missing' && event.payload.action_id !== 'mark-missing') {
      return;
    }

    // TODO: Implement domain logic for mark-missing
    console.log('[MarkMissingConsumer] Executing action:', event.payload);
  }
}
