import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class TrackProgressConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'track-progress.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'track-progress' && event.payload.action_id !== 'track-progress') {
      return;
    }

    // TODO: Implement domain logic for track-progress
    console.log('[TrackProgressConsumer] Executing action:', event.payload);
  }
}
