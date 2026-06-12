import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkParentContactedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-parent-contacted.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-parent-contacted' && event.payload.action_id !== 'mark-parent-contacted') {
      return;
    }

    // TODO: Implement domain logic for mark-parent-contacted
    console.log('[MarkParentContactedConsumer] Executing action:', event.payload);
  }
}
