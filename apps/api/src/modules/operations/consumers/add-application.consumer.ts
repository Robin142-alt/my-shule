import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddApplicationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-application.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-application' && event.payload.action_id !== 'add-application') {
      return;
    }

    // TODO: Implement domain logic for add-application
    console.log('[AddApplicationConsumer] Executing action:', event.payload);
  }
}
