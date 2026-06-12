import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignDutyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-duty.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-duty' && event.payload.action_id !== 'assign-duty') {
      return;
    }

    // TODO: Implement domain logic for assign-duty
    console.log('[AssignDutyConsumer] Executing action:', event.payload);
  }
}
