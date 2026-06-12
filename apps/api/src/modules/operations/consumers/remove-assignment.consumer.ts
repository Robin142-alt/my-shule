import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RemoveAssignmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'remove-assignment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'remove-assignment' && event.payload.action_id !== 'remove-assignment') {
      return;
    }

    // TODO: Implement domain logic for remove-assignment
    console.log('[RemoveAssignmentConsumer] Executing action:', event.payload);
  }
}
