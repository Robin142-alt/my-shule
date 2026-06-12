import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class FlagMissingConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'flag-missing.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'flag-missing' && event.payload.action_id !== 'flag-missing') {
      return;
    }

    // TODO: Implement domain logic for flag-missing
    console.log('[FlagMissingConsumer] Executing action:', event.payload);
  }
}
