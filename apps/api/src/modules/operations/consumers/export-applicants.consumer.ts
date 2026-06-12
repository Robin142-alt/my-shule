import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportApplicantsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-applicants.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-applicants' && event.payload.action_id !== 'export-applicants') {
      return;
    }

    // TODO: Implement domain logic for export-applicants
    console.log('[ExportApplicantsConsumer] Executing action:', event.payload);
  }
}
