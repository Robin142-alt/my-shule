import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AutoPlaceStudentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'auto-place-students.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'auto-place-students' && event.payload.action_id !== 'auto-place-students') {
      return;
    }

    // TODO: Implement domain logic for auto-place-students
    console.log('[AutoPlaceStudentsConsumer] Executing action:', event.payload);
  }
}
