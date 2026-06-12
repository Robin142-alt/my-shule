import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignToCounsellorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-to-counsellor.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-to-counsellor' && event.payload.action_id !== 'assign-to-counsellor') {
      return;
    }

    // TODO: Implement domain logic for assign-to-counsellor
    console.log('[AssignToCounsellorConsumer] Executing action:', event.payload);
  }
}
