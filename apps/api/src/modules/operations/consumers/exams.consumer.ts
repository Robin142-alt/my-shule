import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExamsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'exams.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'exams' && event.payload.action_id !== 'exams') {
      return;
    }

    // TODO: Implement domain logic for exams
    console.log('[ExamsConsumer] Executing action:', event.payload);
  }
}
