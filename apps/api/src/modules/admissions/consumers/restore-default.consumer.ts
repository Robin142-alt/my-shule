import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RestoreDefaultConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'restore-default.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'restore-default' && event.payload.action_id !== 'restore-default') {
      return;
    }

    // TODO: Implement domain logic for restore-default
    console.log('[RestoreDefaultConsumer] Executing action:', event.payload);
  }
}
