import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkInUseConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-in-use.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-in-use' && event.payload.action_id !== 'mark-in-use') {
      return;
    }

    // TODO: Implement domain logic for mark-in-use
    console.log('[MarkInUseConsumer] Executing action:', event.payload);
  }
}
