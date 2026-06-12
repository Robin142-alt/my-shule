import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RegenerateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'regenerate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'regenerate' && event.payload.action_id !== 'regenerate') {
      return;
    }

    // TODO: Implement domain logic for regenerate
    console.log('[RegenerateConsumer] Executing action:', event.payload);
  }
}
