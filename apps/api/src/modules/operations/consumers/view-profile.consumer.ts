import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewProfileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-profile.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-profile' && event.payload.action_id !== 'view-profile') {
      return;
    }

    // TODO: Implement domain logic for view-profile
    console.log('[ViewProfileConsumer] Executing action:', event.payload);
  }
}
