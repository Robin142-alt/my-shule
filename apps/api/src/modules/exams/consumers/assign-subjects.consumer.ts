import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignSubjectsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-subjects.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-subjects' && event.payload.action_id !== 'assign-subjects') {
      return;
    }

    // TODO: Implement domain logic for assign-subjects
    console.log('[AssignSubjectsConsumer] Executing action:', event.payload);
  }
}
