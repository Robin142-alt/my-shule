import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveBatchConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-batch.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-batch' && event.payload.action_id !== 'save-batch') {
      return;
    }

    // TODO: Implement domain logic for save-batch
    console.log('[SaveBatchConsumer] Executing action:', event.payload);
  }
}
