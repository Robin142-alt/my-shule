import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewCoverageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-coverage.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-coverage' && event.payload.action_id !== 'view-coverage') {
      return;
    }

    // TODO: Implement domain logic for view-coverage
    console.log('[ViewCoverageConsumer] Executing action:', event.payload);
  }
}
