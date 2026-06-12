import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EnterScoreConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'enter-score.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'enter-score' && event.payload.action_id !== 'enter-score') {
      return;
    }

    // TODO: Implement domain logic for enter-score
    console.log('[EnterScoreConsumer] Executing action:', event.payload);
  }
}
