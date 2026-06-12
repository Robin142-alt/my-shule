import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignClassConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-class.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-class' && event.payload.action_id !== 'assign-class') {
      return;
    }

    // TODO: Implement domain logic for assign-class
    console.log('[AssignClassConsumer] Executing action:', event.payload);
  }
}
