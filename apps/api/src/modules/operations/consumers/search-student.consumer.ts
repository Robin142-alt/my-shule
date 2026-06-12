import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SearchStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'search-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'search-student' && event.payload.action_id !== 'search-student') {
      return;
    }

    // TODO: Implement domain logic for search-student
    console.log('[SearchStudentConsumer] Executing action:', event.payload);
  }
}
