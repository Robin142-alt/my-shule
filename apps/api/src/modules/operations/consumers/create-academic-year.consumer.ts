import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateAcademicYearConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-academic-year.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-academic-year' && event.payload.action_id !== 'create-academic-year') {
      return;
    }

    // TODO: Implement domain logic for create-academic-year
    console.log('[CreateAcademicYearConsumer] Executing action:', event.payload);
  }
}
