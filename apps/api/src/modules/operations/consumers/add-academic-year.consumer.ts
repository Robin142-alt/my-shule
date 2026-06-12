import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddAcademicYearConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-academic-year.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-academic-year' && event.payload.action_id !== 'add-academic-year') {
      return;
    }

    // TODO: Implement domain logic for add-academic-year
    console.log('[AddAcademicYearConsumer] Executing action:', event.payload);
  }
}
