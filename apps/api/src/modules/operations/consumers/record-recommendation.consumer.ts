import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RecordRecommendationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'record-recommendation.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'record-recommendation' && event.payload.action_id !== 'record-recommendation') {
      return;
    }

    // TODO: Implement domain logic for record-recommendation
    console.log('[RecordRecommendationConsumer] Executing action:', event.payload);
  }
}
