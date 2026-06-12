import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateStudentRecordConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-student-record.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-student-record' && event.payload.action_id !== 'create-student-record') {
      return;
    }

    // TODO: Implement domain logic for create-student-record
    console.log('[CreateStudentRecordConsumer] Executing action:', event.payload);
  }
}
