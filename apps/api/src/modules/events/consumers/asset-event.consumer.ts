import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { WorkflowRepository } from '../repositories/workflow.repository';

@Injectable()
export class AssetEventConsumer implements EventConsumerDescriptor<'asset.request.submitted'> {
  readonly name = 'asset-event.workflow';
  readonly event_name = 'asset.request.submitted' as const;

  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async handle(event: DomainEvent<'asset.request.submitted'>): Promise<void> {
    const payload = event.payload;
    
    await this.workflowRepository.createTask({
      tenant_id: event.tenant_id,
      task_key: `asset-request-${payload.request_id}`,
      assigned_to_role: 'SYSTEM_MONITOR', // Or Maintenance Manager
      created_by_user_id: payload.requested_by_user_id,
      title: 'New Asset Request/Report',
      description: `Asset type: ${payload.asset_type}. Reason: ${payload.reason}.`,
      module: 'asset',
      record_id: payload.request_id,
      priority: 'normal',
    });

    await this.workflowRepository.createNotification({
      tenant_id: event.tenant_id,
      notification_key: `asset-request-notification-${payload.request_id}`,
      recipient_role: 'SYSTEM_MONITOR',
      type: 'ASSET_REQUEST',
      title: 'New Asset Request',
      body: `A new asset request or issue report has been submitted.`,
      source_module: 'asset',
      source_record_id: payload.request_id,
    });
  }
}
