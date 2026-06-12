import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ConvertToApplicationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'convert-to-application.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'convert-to-application' && event.payload.action_id !== 'convert-to-application') {
      return;
    }

    // TODO: Implement domain logic for convert-to-application
    console.log('[ConvertToApplicationConsumer] Executing action:', event.payload);
  }
}
