import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-log' && event.payload.action_id !== 'export-log') {
      return;
    }

    // TODO: Implement domain logic for export-log
    console.log('[ExportLogConsumer] Executing action:', event.payload);
  }
}
