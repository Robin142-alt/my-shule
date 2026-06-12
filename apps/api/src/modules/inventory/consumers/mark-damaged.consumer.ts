import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkDamagedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-damaged.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-damaged' && event.payload.action_id !== 'mark-damaged') {
      return;
    }

    // TODO: Implement domain logic for mark-damaged
    console.log('[MarkDamagedConsumer] Executing action:', event.payload);
  }
}
