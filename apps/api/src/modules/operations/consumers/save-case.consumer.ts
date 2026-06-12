import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveCaseConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-case.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-case' && event.payload.action_id !== 'save-case') {
      return;
    }

    // TODO: Implement domain logic for save-case
    console.log('[SaveCaseConsumer] Executing action:', event.payload);
  }
}
