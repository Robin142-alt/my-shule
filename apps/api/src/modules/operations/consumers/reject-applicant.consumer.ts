import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RejectApplicantConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reject-applicant.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reject-applicant' && event.payload.action_id !== 'reject-applicant') {
      return;
    }

    // TODO: Implement domain logic for reject-applicant
    console.log('[RejectApplicantConsumer] Executing action:', event.payload);
  }
}
