import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignAndNotifyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-and-notify.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-and-notify' && event.payload.action_id !== 'assign-and-notify') {
      return;
    }

    // TODO: Implement domain logic for assign-and-notify
    console.log('[AssignAndNotifyConsumer] Executing action:', event.payload);
  }
}
