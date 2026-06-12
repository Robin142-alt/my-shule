import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitHandoverConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-handover.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-handover' && event.payload.action_id !== 'submit-handover') {
      return;
    }

    // TODO: Implement domain logic for submit-handover
    console.log('[SubmitHandoverConsumer] Executing action:', event.payload);
  }
}
