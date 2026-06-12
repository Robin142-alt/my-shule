import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateFollowUpConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-follow-up.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-follow-up' && event.payload.action_id !== 'create-follow-up') {
      return;
    }

    // TODO: Implement domain logic for create-follow-up
    console.log('[CreateFollowUpConsumer] Executing action:', event.payload);
  }
}
