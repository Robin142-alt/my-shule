import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PreviewTemplateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'preview-template.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'preview-template' && event.payload.action_id !== 'preview-template') {
      return;
    }

    // TODO: Implement domain logic for preview-template
    console.log('[PreviewTemplateConsumer] Executing action:', event.payload);
  }
}
