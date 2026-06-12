import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SuspendConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'suspend.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'suspend' && event.payload.action_id !== 'suspend') {
      return;
    }

    // TODO: Implement domain logic for suspend
    console.log('[SuspendConsumer] Executing action:', event.payload);
  }
}
