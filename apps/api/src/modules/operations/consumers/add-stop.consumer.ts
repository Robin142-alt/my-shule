import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddStopConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-stop.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-stop' && event.payload.action_id !== 'add-stop') {
      return;
    }

    // TODO: Implement domain logic for add-stop
    console.log('[AddStopConsumer] Executing action:', event.payload);
  }
}
