import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ResolveDiscrepancyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'resolve-discrepancy.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'resolve-discrepancy' && event.payload.action_id !== 'resolve-discrepancy') {
      return;
    }

    // TODO: Implement domain logic for resolve-discrepancy
    console.log('[ResolveDiscrepancyConsumer] Executing action:', event.payload);
  }
}
