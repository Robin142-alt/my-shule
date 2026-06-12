import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UpdateInsuranceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'update-insurance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'update-insurance' && event.payload.action_id !== 'update-insurance') {
      return;
    }

    // TODO: Implement domain logic for update-insurance
    console.log('[UpdateInsuranceConsumer] Executing action:', event.payload);
  }
}
