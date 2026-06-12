import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateAssignmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-assignment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-assignment' && event.payload.action_id !== 'create-assignment') {
      return;
    }

    // TODO: Implement domain logic for create-assignment
    console.log('[CreateAssignmentConsumer] Executing action:', event.payload);
  }
}
