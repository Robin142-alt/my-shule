import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CalculateFineConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'calculate-fine.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'calculate-fine' && event.payload.action_id !== 'calculate-fine') {
      return;
    }

    // TODO: Implement domain logic for calculate-fine
    console.log('[CalculateFineConsumer] Executing action:', event.payload);
  }
}
