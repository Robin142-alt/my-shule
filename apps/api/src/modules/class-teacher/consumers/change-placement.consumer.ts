import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ChangePlacementConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'change-placement.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'change-placement' && event.payload.action_id !== 'change-placement') {
      return;
    }

    // TODO: Implement domain logic for change-placement
    console.log('[ChangePlacementConsumer] Executing action:', event.payload);
  }
}
