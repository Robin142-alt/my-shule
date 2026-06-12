import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class IgnoreRowConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'ignore-row.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'ignore-row' && event.payload.action_id !== 'ignore-row') {
      return;
    }

    // TODO: Implement domain logic for ignore-row
    console.log('[IgnoreRowConsumer] Executing action:', event.payload);
  }
}
