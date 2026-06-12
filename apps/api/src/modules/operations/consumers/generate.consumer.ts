import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate' && event.payload.action_id !== 'generate') {
      return;
    }

    // TODO: Implement domain logic for generate
    console.log('[GenerateConsumer] Executing action:', event.payload);
  }
}
