import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddStudentToRouteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-student-to-route.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-student-to-route' && event.payload.action_id !== 'add-student-to-route') {
      return;
    }

    // TODO: Implement domain logic for add-student-to-route
    console.log('[AddStudentToRouteConsumer] Executing action:', event.payload);
  }
}
