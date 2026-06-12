import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditTemplateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-template.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-template' && event.payload.action_id !== 'edit-template') {
      return;
    }

    // TODO: Implement domain logic for edit-template
    console.log('[EditTemplateConsumer] Executing action:', event.payload);
  }
}
