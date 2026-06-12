import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MergeStreamConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'merge-stream.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'merge-stream' && event.payload.action_id !== 'merge-stream') {
      return;
    }

    // TODO: Implement domain logic for merge-stream
    console.log('[MergeStreamConsumer] Executing action:', event.payload);
  }
}
