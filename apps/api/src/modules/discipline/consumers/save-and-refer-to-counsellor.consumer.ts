import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveAndReferToCounsellorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-and-refer-to-counsellor.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-and-refer-to-counsellor' && event.payload.action_id !== 'save-and-refer-to-counsellor') {
      return;
    }

    // TODO: Implement domain logic for save-and-refer-to-counsellor
    console.log('[SaveAndReferToCounsellorConsumer] Executing action:', event.payload);
  }
}
