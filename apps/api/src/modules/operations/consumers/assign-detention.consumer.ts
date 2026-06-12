import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignDetentionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-detention.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-detention' && event.payload.action_id !== 'assign-detention') {
      return;
    }

    // TODO: Implement domain logic for assign-detention
    console.log('[AssignDetentionConsumer] Executing action:', event.payload);
  }
}
