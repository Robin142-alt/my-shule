import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignSubjectConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-subject.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-subject' && event.payload.action_id !== 'assign-subject') {
      return;
    }

    // TODO: Implement domain logic for assign-subject
    console.log('[AssignSubjectConsumer] Executing action:', event.payload);
  }
}
