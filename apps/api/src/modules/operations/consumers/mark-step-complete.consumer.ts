import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkStepCompleteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-step-complete.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-step-complete' && event.payload.action_id !== 'mark-step-complete') {
      return;
    }

    // TODO: Implement domain logic for mark-step-complete
    console.log('[MarkStepCompleteConsumer] Executing action:', event.payload);
  }
}
