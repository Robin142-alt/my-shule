import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportSchoolsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-schools.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-schools' && event.payload.action_id !== 'export-schools') {
      return;
    }

    // TODO: Implement domain logic for export-schools
    console.log('[ExportSchoolsConsumer] Executing action:', event.payload);
  }
}
