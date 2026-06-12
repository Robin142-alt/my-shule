import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SetSubjectGradingRulesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'set-subject-grading-rules.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'set-subject-grading-rules' && event.payload.action_id !== 'set-subject-grading-rules') {
      return;
    }

    // TODO: Implement domain logic for set-subject-grading-rules
    console.log('[SetSubjectGradingRulesConsumer] Executing action:', event.payload);
  }
}
