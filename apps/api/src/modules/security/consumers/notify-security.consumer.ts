import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifySecurityConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-security.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-security' && event.payload.action_id !== 'notify-security') {
      return;
    }

    // TODO: Implement domain logic for notify-security
    console.log('[NotifySecurityConsumer] Executing action:', event.payload);
  }
}
