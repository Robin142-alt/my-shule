import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class StartStocktakeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'start-stocktake.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'start-stocktake' && event.payload.action_id !== 'start-stocktake') {
      return;
    }

    // TODO: Implement domain logic for start-stocktake
    console.log('[StartStocktakeConsumer] Executing action:', event.payload);
  }
}
