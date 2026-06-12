import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UpdateServiceDateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'update-service-date.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'update-service-date' && event.payload.action_id !== 'update-service-date') {
      return;
    }

    // TODO: Implement domain logic for update-service-date
    console.log('[UpdateServiceDateConsumer] Executing action:', event.payload);
  }
}
