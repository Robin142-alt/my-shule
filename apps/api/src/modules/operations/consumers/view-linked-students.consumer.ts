import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewLinkedStudentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-linked-students.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-linked-students' && event.payload.action_id !== 'view-linked-students') {
      return;
    }

    // TODO: Implement domain logic for view-linked-students
    console.log('[ViewLinkedStudentsConsumer] Executing action:', event.payload);
  }
}
