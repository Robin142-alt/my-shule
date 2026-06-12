import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddEnquiryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-enquiry.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-enquiry' && event.payload.action_id !== 'add-enquiry') {
      return;
    }

    // TODO: Implement domain logic for add-enquiry
    console.log('[AddEnquiryConsumer] Executing action:', event.payload);
  }
}
