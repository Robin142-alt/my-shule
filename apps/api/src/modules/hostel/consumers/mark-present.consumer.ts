import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkPresentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-present.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-present' && event.payload.action_id !== 'mark-present') {
      return;
    }

    // TODO: Implement domain logic for mark-present
    console.log('[MarkPresentConsumer] Executing action:', event.payload);
  }
}
