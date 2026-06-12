import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveAndAssignConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-and-assign.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-and-assign' && event.payload.action_id !== 'save-and-assign') {
      return;
    }

    // TODO: Implement domain logic for save-and-assign
    console.log('[SaveAndAssignConsumer] Executing action:', event.payload);
  }
}
