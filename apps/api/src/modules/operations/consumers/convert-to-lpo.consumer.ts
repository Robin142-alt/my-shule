import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ConvertToLpoConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'convert-to-lpo.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'convert-to-lpo' && event.payload.action_id !== 'convert-to-lpo') {
      return;
    }

    // TODO: Implement domain logic for convert-to-lpo
    console.log('[ConvertToLpoConsumer] Executing action:', event.payload);
  }
}
