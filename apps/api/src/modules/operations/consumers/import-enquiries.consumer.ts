import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportEnquiriesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-enquiries.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-enquiries' && event.payload.action_id !== 'import-enquiries') {
      return;
    }

    // TODO: Implement domain logic for import-enquiries
    console.log('[ImportEnquiriesConsumer] Executing action:', event.payload);
  }
}
