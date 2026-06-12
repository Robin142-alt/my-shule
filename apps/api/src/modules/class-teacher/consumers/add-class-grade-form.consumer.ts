import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddClassGradeFormConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-class-grade-form.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-class-grade-form' && event.payload.action_id !== 'add-class-grade-form') {
      return;
    }

    // TODO: Implement domain logic for add-class-grade-form
    console.log('[AddClassGradeFormConsumer] Executing action:', event.payload);
  }
}
