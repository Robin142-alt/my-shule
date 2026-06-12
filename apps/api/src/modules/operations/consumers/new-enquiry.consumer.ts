import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NewEnquiryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'new-enquiry.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'new-enquiry' && event.payload.action_id !== 'new-enquiry') {
      return;
    }

    // TODO: Implement domain logic for new-enquiry
    console.log('[NewEnquiryConsumer] Executing action:', event.payload);
  }
}
