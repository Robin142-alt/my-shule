import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ConvertToStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'convert-to-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'convert-to-student' && event.payload.action_id !== 'convert-to-student') {
      return;
    }

    // TODO: Implement domain logic for convert-to-student
    console.log('[ConvertToStudentConsumer] Executing action:', event.payload);
  }
}
