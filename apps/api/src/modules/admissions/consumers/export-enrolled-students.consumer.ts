import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportEnrolledStudentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-enrolled-students.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-enrolled-students' && event.payload.action_id !== 'export-enrolled-students') {
      return;
    }

    // TODO: Implement domain logic for export-enrolled-students
    console.log('[ExportEnrolledStudentsConsumer] Executing action:', event.payload);
  }
}
