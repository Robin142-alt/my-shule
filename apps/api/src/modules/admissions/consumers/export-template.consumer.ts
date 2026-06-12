import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportTemplateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-template.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-template' && event.payload.action_id !== 'export-template') {
      return;
    }

    // TODO: Implement domain logic for export-template
    console.log('[ExportTemplateConsumer] Executing action:', event.payload);
  }
}
