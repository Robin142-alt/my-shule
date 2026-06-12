import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddAssessmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-assessment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-assessment' && event.payload.action_id !== 'add-assessment') {
      return;
    }

    // TODO: Implement domain logic for add-assessment
    console.log('[AddAssessmentConsumer] Executing action:', event.payload);
  }
}
