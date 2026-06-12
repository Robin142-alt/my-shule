import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class FlagOutliersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'flag-outliers.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'flag-outliers' && event.payload.action_id !== 'flag-outliers') {
      return;
    }

    // TODO: Implement domain logic for flag-outliers
    console.log('[FlagOutliersConsumer] Executing action:', event.payload);
  }
}
