import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NewApplicationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'new-application.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'new-application' && event.payload.action_id !== 'new-application') {
      return;
    }

    // TODO: Implement domain logic for new-application
    console.log('[NewApplicationConsumer] Executing action:', event.payload);
  }
}
