import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class FlagConcernConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'flag-concern.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'flag-concern' && event.payload.action_id !== 'flag-concern') {
      return;
    }

    // TODO: Implement domain logic for flag-concern
    console.log('[FlagConcernConsumer] Executing action:', event.payload);
  }
}
