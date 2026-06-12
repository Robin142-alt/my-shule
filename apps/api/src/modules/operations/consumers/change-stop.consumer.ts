import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ChangeStopConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'change-stop.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'change-stop' && event.payload.action_id !== 'change-stop') {
      return;
    }

    // TODO: Implement domain logic for change-stop
    console.log('[ChangeStopConsumer] Executing action:', event.payload);
  }
}
