import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveGateExitIfPermittedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-gate-exit-if-permitted.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-gate-exit-if-permitted' && event.payload.action_id !== 'approve-gate-exit-if-permitted') {
      return;
    }

    // TODO: Implement domain logic for approve-gate-exit-if-permitted
    console.log('[ApproveGateExitIfPermittedConsumer] Executing action:', event.payload);
  }
}
