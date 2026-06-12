import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkNoShowConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-no-show.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-no-show' && event.payload.action_id !== 'mark-no-show') {
      return;
    }

    // TODO: Implement domain logic for mark-no-show
    console.log('[MarkNoShowConsumer] Executing action:', event.payload);
  }
}
