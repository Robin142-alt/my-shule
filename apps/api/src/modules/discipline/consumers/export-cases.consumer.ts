import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportCasesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-cases.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-cases' && event.payload.action_id !== 'export-cases') {
      return;
    }

    // TODO: Implement domain logic for export-cases
    console.log('[ExportCasesConsumer] Executing action:', event.payload);
  }
}
