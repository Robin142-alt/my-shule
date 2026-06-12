import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignInvigilatorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-invigilator.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-invigilator' && event.payload.action_id !== 'assign-invigilator') {
      return;
    }

    // TODO: Implement domain logic for assign-invigilator
    console.log('[AssignInvigilatorConsumer] Executing action:', event.payload);
  }
}
