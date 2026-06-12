import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OnlyKisumuBoysDemoTenantMayHaveDemoDataConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'only-kisumu-boys-demo-tenant-may-have-demo-data.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'only-kisumu-boys-demo-tenant-may-have-demo-data' && event.payload.action_id !== 'only-kisumu-boys-demo-tenant-may-have-demo-data') {
      return;
    }

    // TODO: Implement domain logic for only-kisumu-boys-demo-tenant-may-have-demo-data
    console.log('[OnlyKisumuBoysDemoTenantMayHaveDemoDataConsumer] Executing action:', event.payload);
  }
}
