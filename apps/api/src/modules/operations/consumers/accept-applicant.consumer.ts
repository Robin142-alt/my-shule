import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AcceptApplicantConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'accept-applicant.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'accept-applicant' && event.payload.action_id !== 'accept-applicant') {
      return;
    }

    // TODO: Implement domain logic for accept-applicant
    console.log('[AcceptApplicantConsumer] Executing action:', event.payload);
  }
}
