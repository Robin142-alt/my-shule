import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DeactivateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'deactivate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'deactivate' && event.payload.action_id !== 'deactivate') {
      return;
    }

    // TODO: Implement domain logic for deactivate
    console.log('[DeactivateConsumer] Executing action:', event.payload);
  }
}
