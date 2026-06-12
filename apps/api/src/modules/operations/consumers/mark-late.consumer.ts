import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkLateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-late.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-late' && event.payload.action_id !== 'mark-late') {
      return;
    }

    // TODO: Implement domain logic for mark-late
    console.log('[MarkLateConsumer] Executing action:', event.payload);
  }
}
