import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintInvigilationRosterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-invigilation-roster.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-invigilation-roster' && event.payload.action_id !== 'print-invigilation-roster') {
      return;
    }

    // TODO: Implement domain logic for print-invigilation-roster
    console.log('[PrintInvigilationRosterConsumer] Executing action:', event.payload);
  }
}
