import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RefreshConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'refresh.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'refresh' && event.payload.action_id !== 'refresh') {
      return;
    }

    // TODO: Implement domain logic for refresh
    console.log('[RefreshConsumer] Executing action:', event.payload);
  }
}
