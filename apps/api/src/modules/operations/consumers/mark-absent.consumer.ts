import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkAbsentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-absent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-absent' && event.payload.action_id !== 'mark-absent') {
      return;
    }

    // TODO: Implement domain logic for mark-absent
    console.log('[MarkAbsentConsumer] Executing action:', event.payload);
  }
}
