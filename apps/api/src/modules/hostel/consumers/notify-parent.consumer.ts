import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyParentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-parent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-parent' && event.payload.action_id !== 'notify-parent') {
      return;
    }

    // TODO: Implement domain logic for notify-parent
    console.log('[NotifyParentConsumer] Executing action:', event.payload);
  }
}
