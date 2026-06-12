import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyParentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-parents.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-parents' && event.payload.action_id !== 'notify-parents') {
      return;
    }

    // TODO: Implement domain logic for notify-parents
    console.log('[NotifyParentsConsumer] Executing action:', event.payload);
  }
}
