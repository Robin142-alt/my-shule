import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveFollowUpConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-follow-up.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-follow-up' && event.payload.action_id !== 'save-follow-up') {
      return;
    }

    // TODO: Implement domain logic for save-follow-up
    console.log('[SaveFollowUpConsumer] Executing action:', event.payload);
  }
}
