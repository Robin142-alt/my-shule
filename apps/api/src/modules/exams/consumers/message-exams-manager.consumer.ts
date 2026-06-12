import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MessageExamsManagerConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'message-exams-manager.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'message-exams-manager' && event.payload.action_id !== 'message-exams-manager') {
      return;
    }

    // TODO: Implement domain logic for message-exams-manager
    console.log('[MessageExamsManagerConsumer] Executing action:', event.payload);
  }
}
