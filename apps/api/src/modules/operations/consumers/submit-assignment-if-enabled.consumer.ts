import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitAssignmentIfEnabledConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-assignment-if-enabled.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-assignment-if-enabled' && event.payload.action_id !== 'submit-assignment-if-enabled') {
      return;
    }

    // TODO: Implement domain logic for submit-assignment-if-enabled
    console.log('[SubmitAssignmentIfEnabledConsumer] Executing action:', event.payload);
  }
}
