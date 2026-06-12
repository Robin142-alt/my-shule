import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyDeputyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-deputy.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-deputy' && event.payload.action_id !== 'notify-deputy') {
      return;
    }

    // TODO: Implement domain logic for notify-deputy
    console.log('[NotifyDeputyConsumer] Executing action:', event.payload);
  }
}
