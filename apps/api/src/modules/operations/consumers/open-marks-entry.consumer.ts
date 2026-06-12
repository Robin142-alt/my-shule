import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenMarksEntryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-marks-entry.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-marks-entry' && event.payload.action_id !== 'open-marks-entry') {
      return;
    }

    // TODO: Implement domain logic for open-marks-entry
    console.log('[OpenMarksEntryConsumer] Executing action:', event.payload);
  }
}
