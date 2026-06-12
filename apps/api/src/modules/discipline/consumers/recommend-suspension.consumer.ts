import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RecommendSuspensionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'recommend-suspension.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'recommend-suspension' && event.payload.action_id !== 'recommend-suspension') {
      return;
    }

    // TODO: Implement domain logic for recommend-suspension
    console.log('[RecommendSuspensionConsumer] Executing action:', event.payload);
  }
}
