import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportArrearsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-arrears.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-arrears' && event.payload.action_id !== 'export-arrears') {
      return;
    }

    // TODO: Implement domain logic for export-arrears
    console.log('[ExportArrearsConsumer] Executing action:', event.payload);
  }
}
