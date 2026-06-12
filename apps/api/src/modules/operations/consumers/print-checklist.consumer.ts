import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintChecklistConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-checklist.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-checklist' && event.payload.action_id !== 'print-checklist') {
      return;
    }

    // TODO: Implement domain logic for print-checklist
    console.log('[PrintChecklistConsumer] Executing action:', event.payload);
  }
}
