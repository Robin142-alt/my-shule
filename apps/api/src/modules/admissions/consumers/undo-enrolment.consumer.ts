import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UndoEnrolmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'undo-enrolment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'undo-enrolment' && event.payload.action_id !== 'undo-enrolment') {
      return;
    }

    // TODO: Implement domain logic for undo-enrolment
    console.log('[UndoEnrolmentConsumer] Executing action:', event.payload);
  }
}
