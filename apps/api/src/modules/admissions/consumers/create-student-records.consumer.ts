import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateStudentRecordsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-student-records.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-student-records' && event.payload.action_id !== 'create-student-records') {
      return;
    }

    // TODO: Implement domain logic for create-student-records
    console.log('[CreateStudentRecordsConsumer] Executing action:', event.payload);
  }
}
