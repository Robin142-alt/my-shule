import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintRosterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-roster.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-roster' && event.payload.action_id !== 'print-roster') {
      return;
    }

    // TODO: Implement domain logic for print-roster
    console.log('[PrintRosterConsumer] Executing action:', event.payload);
  }
}
