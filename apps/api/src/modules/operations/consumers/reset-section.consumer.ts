import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ResetSectionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reset-section.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reset-section' && event.payload.action_id !== 'reset-section') {
      return;
    }

    // TODO: Implement domain logic for reset-section
    console.log('[ResetSectionConsumer] Executing action:', event.payload);
  }
}
