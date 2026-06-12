import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportStudentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-students.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-students' && event.payload.action_id !== 'import-students') {
      return;
    }

    // TODO: Implement domain logic for import-students
    console.log('[ImportStudentsConsumer] Executing action:', event.payload);
  }
}
