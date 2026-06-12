import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyAccountantConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-accountant.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-accountant' && event.payload.action_id !== 'notify-accountant') {
      return;
    }

    // TODO: Implement domain logic for notify-accountant
    console.log('[NotifyAccountantConsumer] Executing action:', event.payload);
  }
}
