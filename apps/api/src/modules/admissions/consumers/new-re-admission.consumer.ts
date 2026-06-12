import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NewReAdmissionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'new-re-admission.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'new-re-admission' && event.payload.action_id !== 'new-re-admission') {
      return;
    }

    // TODO: Implement domain logic for new-re-admission
    console.log('[NewReAdmissionConsumer] Executing action:', event.payload);
  }
}
