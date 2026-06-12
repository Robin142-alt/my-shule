import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddWarningConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-warning.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-warning' && event.payload.action_id !== 'add-warning') {
      return;
    }

    // TODO: Implement domain logic for add-warning
    console.log('[AddWarningConsumer] Executing action:', event.payload);
  }
}
