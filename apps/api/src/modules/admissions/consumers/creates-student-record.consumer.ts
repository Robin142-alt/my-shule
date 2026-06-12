import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreatesStudentRecordConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'creates-student-record.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'creates-student-record' && event.payload.action_id !== 'creates-student-record') {
      return;
    }

    // TODO: Implement domain logic for creates-student-record
    console.log('[CreatesStudentRecordConsumer] Executing action:', event.payload);
  }
}
