import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view' && event.payload.action_id !== 'view') {
      return;
    }

    // TODO: Implement domain logic for view
    console.log('[ViewConsumer] Executing action:', event.payload);
  }
}
