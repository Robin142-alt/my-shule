import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveDutyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-duty.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-duty' && event.payload.action_id !== 'save-duty') {
      return;
    }

    // TODO: Implement domain logic for save-duty
    console.log('[SaveDutyConsumer] Executing action:', event.payload);
  }
}
