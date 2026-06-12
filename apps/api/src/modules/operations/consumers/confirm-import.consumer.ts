import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ConfirmImportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'confirm-import.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'confirm-import' && event.payload.action_id !== 'confirm-import') {
      return;
    }

    // TODO: Implement domain logic for confirm-import
    console.log('[ConfirmImportConsumer] Executing action:', event.payload);
  }
}
