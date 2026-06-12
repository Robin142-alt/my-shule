import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveSettingsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-settings.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-settings' && event.payload.action_id !== 'save-settings') {
      return;
    }

    // TODO: Implement domain logic for save-settings
    console.log('[SaveSettingsConsumer] Executing action:', event.payload);
  }
}
