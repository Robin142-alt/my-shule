import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignHodConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-hod.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-hod' && event.payload.action_id !== 'assign-hod') {
      return;
    }

    // TODO: Implement domain logic for assign-hod
    console.log('[AssignHodConsumer] Executing action:', event.payload);
  }
}
