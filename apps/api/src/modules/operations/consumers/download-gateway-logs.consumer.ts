import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadGatewayLogsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-gateway-logs.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-gateway-logs' && event.payload.action_id !== 'download-gateway-logs') {
      return;
    }

    // TODO: Implement domain logic for download-gateway-logs
    console.log('[DownloadGatewayLogsConsumer] Executing action:', event.payload);
  }
}
