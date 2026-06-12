import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CallParentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'call-parent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'call-parent' && event.payload.action_id !== 'call-parent') {
      return;
    }

    // TODO: Implement domain logic for call-parent
    console.log('[CallParentConsumer] Executing action:', event.payload);
  }
}
