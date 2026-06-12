import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignToClassConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-to-class.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-to-class' && event.payload.action_id !== 'assign-to-class') {
      return;
    }

    // TODO: Implement domain logic for assign-to-class
    console.log('[AssignToClassConsumer] Executing action:', event.payload);
  }
}
