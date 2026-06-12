import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AdmitStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'admit-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'admit-student' && event.payload.action_id !== 'admit-student') {
      return;
    }

    // TODO: Implement domain logic for admit-student
    console.log('[AdmitStudentConsumer] Executing action:', event.payload);
  }
}
