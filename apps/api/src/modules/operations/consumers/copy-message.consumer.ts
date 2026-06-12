import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CopyMessageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'copy-message.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'copy-message' && event.payload.action_id !== 'copy-message') {
      return;
    }

    // TODO: Implement domain logic for copy-message
    console.log('[CopyMessageConsumer] Executing action:', event.payload);
  }
}
