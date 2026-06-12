import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewErrorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-error.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-error' && event.payload.action_id !== 'view-error') {
      return;
    }

    // TODO: Implement domain logic for view-error
    console.log('[ViewErrorConsumer] Executing action:', event.payload);
  }
}
