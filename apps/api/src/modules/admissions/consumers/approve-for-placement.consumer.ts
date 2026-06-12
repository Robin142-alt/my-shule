import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveForPlacementConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-for-placement.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-for-placement' && event.payload.action_id !== 'approve-for-placement') {
      return;
    }

    // TODO: Implement domain logic for approve-for-placement
    console.log('[ApproveForPlacementConsumer] Executing action:', event.payload);
  }
}
