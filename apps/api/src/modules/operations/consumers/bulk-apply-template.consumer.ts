import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class BulkApplyTemplateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'bulk-apply-template.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'bulk-apply-template' && event.payload.action_id !== 'bulk-apply-template') {
      return;
    }

    // TODO: Implement domain logic for bulk-apply-template
    console.log('[BulkApplyTemplateConsumer] Executing action:', event.payload);
  }
}
