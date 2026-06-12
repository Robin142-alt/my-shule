import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CallLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'call-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'call-log' && event.payload.action_id !== 'call-log') {
      return;
    }

    // TODO: Implement domain logic for call-log
    console.log('[CallLogConsumer] Executing action:', event.payload);
  }
}
