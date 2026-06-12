import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateApplicationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-application.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-application' && event.payload.action_id !== 'create-application') {
      return;
    }

    // TODO: Implement domain logic for create-application
    console.log('[CreateApplicationConsumer] Executing action:', event.payload);
  }
}
