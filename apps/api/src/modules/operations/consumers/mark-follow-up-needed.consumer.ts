import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkFollowUpNeededConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-follow-up-needed.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-follow-up-needed' && event.payload.action_id !== 'mark-follow-up-needed') {
      return;
    }

    // TODO: Implement domain logic for mark-follow-up-needed
    console.log('[MarkFollowUpNeededConsumer] Executing action:', event.payload);
  }
}
