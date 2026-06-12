import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CheckOutConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'check-out.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'check-out' && event.payload.action_id !== 'check-out') {
      return;
    }

    // TODO: Implement domain logic for check-out
    console.log('[CheckOutConsumer] Executing action:', event.payload);
  }
}
