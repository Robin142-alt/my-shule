import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintInterviewListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-interview-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-interview-list' && event.payload.action_id !== 'print-interview-list') {
      return;
    }

    // TODO: Implement domain logic for print-interview-list
    console.log('[PrintInterviewListConsumer] Executing action:', event.payload);
  }
}
