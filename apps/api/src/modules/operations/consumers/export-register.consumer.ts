import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportRegisterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-register.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-register' && event.payload.action_id !== 'export-register') {
      return;
    }

    // TODO: Implement domain logic for export-register
    console.log('[ExportRegisterConsumer] Executing action:', event.payload);
  }
}
