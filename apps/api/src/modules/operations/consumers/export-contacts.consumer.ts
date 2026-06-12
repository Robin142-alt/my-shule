import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportContactsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-contacts.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-contacts' && event.payload.action_id !== 'export-contacts') {
      return;
    }

    // TODO: Implement domain logic for export-contacts
    console.log('[ExportContactsConsumer] Executing action:', event.payload);
  }
}
