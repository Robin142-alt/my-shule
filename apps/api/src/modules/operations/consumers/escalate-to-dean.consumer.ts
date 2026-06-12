import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EscalateToDeanConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'escalate-to-dean.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'escalate-to-dean' && event.payload.action_id !== 'escalate-to-dean') {
      return;
    }

    // TODO: Implement domain logic for escalate-to-dean
    console.log('[EscalateToDeanConsumer] Executing action:', event.payload);
  }
}
