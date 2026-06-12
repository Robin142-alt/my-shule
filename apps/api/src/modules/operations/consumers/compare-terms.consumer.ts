import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CompareTermsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'compare-terms.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'compare-terms' && event.payload.action_id !== 'compare-terms') {
      return;
    }

    // TODO: Implement domain logic for compare-terms
    console.log('[CompareTermsConsumer] Executing action:', event.payload);
  }
}
