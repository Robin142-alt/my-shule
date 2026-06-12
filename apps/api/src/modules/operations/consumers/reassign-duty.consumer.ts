import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReassignDutyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reassign-duty.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reassign-duty' && event.payload.action_id !== 'reassign-duty') {
      return;
    }

    // TODO: Implement domain logic for reassign-duty
    console.log('[ReassignDutyConsumer] Executing action:', event.payload);
  }
}
