import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UnlinkConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'unlink.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'unlink' && event.payload.action_id !== 'unlink') {
      return;
    }

    // TODO: Implement domain logic for unlink
    console.log('[UnlinkConsumer] Executing action:', event.payload);
  }
}
