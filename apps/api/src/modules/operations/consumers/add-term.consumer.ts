import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddTermConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-term.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-term' && event.payload.action_id !== 'add-term') {
      return;
    }

    // TODO: Implement domain logic for add-term
    console.log('[AddTermConsumer] Executing action:', event.payload);
  }
}
