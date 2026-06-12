import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class FinanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'finance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'finance' && event.payload.action_id !== 'finance') {
      return;
    }

    // TODO: Implement domain logic for finance
    console.log('[FinanceConsumer] Executing action:', event.payload);
  }
}
