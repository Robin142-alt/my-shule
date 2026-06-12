import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportOnboardingReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-onboarding-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-onboarding-report' && event.payload.action_id !== 'export-onboarding-report') {
      return;
    }

    // TODO: Implement domain logic for export-onboarding-report
    console.log('[ExportOnboardingReportConsumer] Executing action:', event.payload);
  }
}
