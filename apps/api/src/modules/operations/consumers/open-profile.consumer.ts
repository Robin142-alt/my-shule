import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenProfileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-profile.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-profile' && event.payload.action_id !== 'open-profile') {
      return;
    }

    // TODO: Implement domain logic for open-profile
    console.log('[OpenProfileConsumer] Executing action:', event.payload);
  }
}
