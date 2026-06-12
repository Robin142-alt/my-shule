import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadPlanConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-plan.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-plan' && event.payload.action_id !== 'download-plan') {
      return;
    }

    // TODO: Implement domain logic for download-plan
    console.log('[DownloadPlanConsumer] Executing action:', event.payload);
  }
}
