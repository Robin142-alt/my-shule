import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkResolvedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-resolved.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-resolved' && event.payload.action_id !== 'mark-resolved') {
      return;
    }

    // TODO: Implement domain logic for mark-resolved
    console.log('[MarkResolvedConsumer] Executing action:', event.payload);
  }
}
