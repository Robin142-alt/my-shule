import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class TrackStatusConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'track-status.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'track-status' && event.payload.action_id !== 'track-status') {
      return;
    }

    // TODO: Implement domain logic for track-status
    console.log('[TrackStatusConsumer] Executing action:', event.payload);
  }
}
