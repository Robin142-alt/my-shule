import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignFollowUpConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-follow-up.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-follow-up' && event.payload.action_id !== 'assign-follow-up') {
      return;
    }

    // TODO: Implement domain logic for assign-follow-up
    console.log('[AssignFollowUpConsumer] Executing action:', event.payload);
  }
}
