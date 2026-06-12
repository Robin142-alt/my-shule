import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignStreamConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-stream.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-stream' && event.payload.action_id !== 'assign-stream') {
      return;
    }

    // TODO: Implement domain logic for assign-stream
    console.log('[AssignStreamConsumer] Executing action:', event.payload);
  }
}
