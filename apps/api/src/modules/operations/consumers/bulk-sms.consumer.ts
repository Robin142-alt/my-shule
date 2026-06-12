import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class BulkSmsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'bulk-sms.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'bulk-sms' && event.payload.action_id !== 'bulk-sms') {
      return;
    }

    // TODO: Implement domain logic for bulk-sms
    console.log('[BulkSmsConsumer] Executing action:', event.payload);
  }
}
