import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LogFaultConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'log-fault.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'log-fault' && event.payload.action_id !== 'log-fault') {
      return;
    }

    // TODO: Implement domain logic for log-fault
    console.log('[LogFaultConsumer] Executing action:', event.payload);
  }
}
