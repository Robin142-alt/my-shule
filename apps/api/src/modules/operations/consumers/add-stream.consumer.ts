import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddStreamConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-stream.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-stream' && event.payload.action_id !== 'add-stream') {
      return;
    }

    // TODO: Implement domain logic for add-stream
    console.log('[AddStreamConsumer] Executing action:', event.payload);
  }
}
