import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendToParentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-to-parent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-to-parent' && event.payload.action_id !== 'send-to-parent') {
      return;
    }

    // TODO: Implement domain logic for send-to-parent
    console.log('[SendToParentConsumer] Executing action:', event.payload);
  }
}
