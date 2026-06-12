import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LinkToStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'link-to-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'link-to-student' && event.payload.action_id !== 'link-to-student') {
      return;
    }

    // TODO: Implement domain logic for link-to-student
    console.log('[LinkToStudentConsumer] Executing action:', event.payload);
  }
}
