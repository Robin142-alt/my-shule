import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateLpoConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-lpo.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-lpo' && event.payload.action_id !== 'generate-lpo') {
      return;
    }

    // TODO: Implement domain logic for generate-lpo
    console.log('[GenerateLpoConsumer] Executing action:', event.payload);
  }
}
