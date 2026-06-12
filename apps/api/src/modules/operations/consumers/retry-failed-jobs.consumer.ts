import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RetryFailedJobsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'retry-failed-jobs.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'retry-failed-jobs' && event.payload.action_id !== 'retry-failed-jobs') {
      return;
    }

    // TODO: Implement domain logic for retry-failed-jobs
    console.log('[RetryFailedJobsConsumer] Executing action:', event.payload);
  }
}
