import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save' && event.payload.action_id !== 'save') {
      return;
    }

    // TODO: Implement domain logic for save
    console.log('[SaveConsumer] Executing action:', event.payload);
  }
}
