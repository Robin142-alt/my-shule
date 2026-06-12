import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkStepDoneConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-step-done.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-step-done' && event.payload.action_id !== 'mark-step-done') {
      return;
    }

    // TODO: Implement domain logic for mark-step-done
    console.log('[MarkStepDoneConsumer] Executing action:', event.payload);
  }
}
