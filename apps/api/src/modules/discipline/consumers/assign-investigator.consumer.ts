import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignInvestigatorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-investigator.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-investigator' && event.payload.action_id !== 'assign-investigator') {
      return;
    }

    // TODO: Implement domain logic for assign-investigator
    console.log('[AssignInvestigatorConsumer] Executing action:', event.payload);
  }
}
