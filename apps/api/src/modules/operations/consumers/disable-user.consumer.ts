import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DisableUserConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'disable-user.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'disable-user' && event.payload.action_id !== 'disable-user') {
      return;
    }

    // TODO: Implement domain logic for disable-user
    console.log('[DisableUserConsumer] Executing action:', event.payload);
  }
}
