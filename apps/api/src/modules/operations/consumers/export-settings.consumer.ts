import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportSettingsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-settings.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-settings' && event.payload.action_id !== 'export-settings') {
      return;
    }

    // TODO: Implement domain logic for export-settings
    console.log('[ExportSettingsConsumer] Executing action:', event.payload);
  }
}
