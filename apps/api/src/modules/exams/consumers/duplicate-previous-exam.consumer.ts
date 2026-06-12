import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DuplicatePreviousExamConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'duplicate-previous-exam.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'duplicate-previous-exam' && event.payload.action_id !== 'duplicate-previous-exam') {
      return;
    }

    // TODO: Implement domain logic for duplicate-previous-exam
    console.log('[DuplicatePreviousExamConsumer] Executing action:', event.payload);
  }
}
