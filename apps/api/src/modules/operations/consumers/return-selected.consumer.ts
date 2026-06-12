import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnSelectedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return-selected.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return-selected' && event.payload.action_id !== 'return-selected') {
      return;
    }

    // TODO: Implement domain logic for return-selected
    console.log('[ReturnSelectedConsumer] Executing action:', event.payload);
  }
}
