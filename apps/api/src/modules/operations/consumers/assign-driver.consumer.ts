import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignDriverConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-driver.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-driver' && event.payload.action_id !== 'assign-driver') {
      return;
    }

    // TODO: Implement domain logic for assign-driver
    console.log('[AssignDriverConsumer] Executing action:', event.payload);
  }
}
