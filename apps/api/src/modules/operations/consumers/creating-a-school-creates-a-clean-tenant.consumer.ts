import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreatingASchoolCreatesACleanTenantConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'creating-a-school-creates-a-clean-tenant.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'creating-a-school-creates-a-clean-tenant' && event.payload.action_id !== 'creating-a-school-creates-a-clean-tenant') {
      return;
    }

    // TODO: Implement domain logic for creating-a-school-creates-a-clean-tenant
    console.log('[CreatingASchoolCreatesACleanTenantConsumer] Executing action:', event.payload);
  }
}
