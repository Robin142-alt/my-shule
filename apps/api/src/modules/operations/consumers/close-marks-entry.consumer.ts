import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CloseMarksEntryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'close-marks-entry.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'close-marks-entry' && event.payload.action_id !== 'close-marks-entry') {
      return;
    }

    // TODO: Implement domain logic for close-marks-entry
    console.log('[CloseMarksEntryConsumer] Executing action:', event.payload);
  }
}
