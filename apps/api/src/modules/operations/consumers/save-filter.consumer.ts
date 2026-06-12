import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveFilterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-filter.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-filter' && event.payload.action_id !== 'save-filter') {
      return;
    }

    // TODO: Implement domain logic for save-filter
    console.log('[SaveFilterConsumer] Executing action:', event.payload);
  }
}
