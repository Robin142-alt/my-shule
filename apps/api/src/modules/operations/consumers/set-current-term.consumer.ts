import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SetCurrentTermConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'set-current-term.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'set-current-term' && event.payload.action_id !== 'set-current-term') {
      return;
    }

    // TODO: Implement domain logic for set-current-term
    console.log('[SetCurrentTermConsumer] Executing action:', event.payload);
  }
}
