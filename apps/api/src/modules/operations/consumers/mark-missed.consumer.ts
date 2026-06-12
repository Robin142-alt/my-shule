import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkMissedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-missed.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-missed' && event.payload.action_id !== 'mark-missed') {
      return;
    }

    // TODO: Implement domain logic for mark-missed
    console.log('[MarkMissedConsumer] Executing action:', event.payload);
  }
}
