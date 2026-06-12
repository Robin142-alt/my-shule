import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintWeakSubjectsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-weak-subjects.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-weak-subjects' && event.payload.action_id !== 'print-weak-subjects') {
      return;
    }

    // TODO: Implement domain logic for print-weak-subjects
    console.log('[PrintWeakSubjectsConsumer] Executing action:', event.payload);
  }
}
