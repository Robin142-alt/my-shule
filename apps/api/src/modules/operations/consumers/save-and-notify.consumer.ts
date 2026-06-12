import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveAndNotifyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-and-notify.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-and-notify' && event.payload.action_id !== 'save-and-notify') {
      return;
    }

    // TODO: Implement domain logic for save-and-notify
    console.log('[SaveAndNotifyConsumer] Executing action:', event.payload);
  }
}
