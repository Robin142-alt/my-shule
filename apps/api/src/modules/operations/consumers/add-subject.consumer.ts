import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddSubjectConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-subject.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-subject' && event.payload.action_id !== 'add-subject') {
      return;
    }

    // TODO: Implement domain logic for add-subject
    console.log('[AddSubjectConsumer] Executing action:', event.payload);
  }
}
