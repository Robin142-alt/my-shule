import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveProfileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-profile.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-profile' && event.payload.action_id !== 'save-profile') {
      return;
    }

    // TODO: Implement domain logic for save-profile
    console.log('[SaveProfileConsumer] Executing action:', event.payload);
  }
}
