import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitToHodConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-to-hod.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-to-hod' && event.payload.action_id !== 'submit-to-hod') {
      return;
    }

    // TODO: Implement domain logic for submit-to-hod
    console.log('[SubmitToHodConsumer] Executing action:', event.payload);
  }
}
