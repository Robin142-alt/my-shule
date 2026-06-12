import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewExamConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-exam.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-exam' && event.payload.action_id !== 'view-exam') {
      return;
    }

    // TODO: Implement domain logic for view-exam
    console.log('[ViewExamConsumer] Executing action:', event.payload);
  }
}
