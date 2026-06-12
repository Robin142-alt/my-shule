import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LockExamConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'lock-exam.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'lock-exam' && event.payload.action_id !== 'lock-exam') {
      return;
    }

    // TODO: Implement domain logic for lock-exam
    console.log('[LockExamConsumer] Executing action:', event.payload);
  }
}
