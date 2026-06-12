import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewFinanceResponseConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-finance-response.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-finance-response' && event.payload.action_id !== 'view-finance-response') {
      return;
    }

    // TODO: Implement domain logic for view-finance-response
    console.log('[ViewFinanceResponseConsumer] Executing action:', event.payload);
  }
}
