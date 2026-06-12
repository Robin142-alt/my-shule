import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NoDemoDataShouldBeCopiedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'no-demo-data-should-be-copied.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'no-demo-data-should-be-copied' && event.payload.action_id !== 'no-demo-data-should-be-copied') {
      return;
    }

    // TODO: Implement domain logic for no-demo-data-should-be-copied
    console.log('[NoDemoDataShouldBeCopiedConsumer] Executing action:', event.payload);
  }
}
