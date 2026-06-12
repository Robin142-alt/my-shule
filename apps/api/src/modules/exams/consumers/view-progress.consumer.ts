import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewProgressConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-progress.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-progress' && event.payload.action_id !== 'view-progress') {
      return;
    }

    // TODO: Implement domain logic for view-progress
    console.log('[ViewProgressConsumer] Executing action:', event.payload);
  }
}
