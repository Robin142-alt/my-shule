import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnToTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return-to-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return-to-teacher' && event.payload.action_id !== 'return-to-teacher') {
      return;
    }

    // TODO: Implement domain logic for return-to-teacher
    console.log('[ReturnToTeacherConsumer] Executing action:', event.payload);
  }
}
