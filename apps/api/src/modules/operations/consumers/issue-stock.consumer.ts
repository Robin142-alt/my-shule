import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class IssueStockConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(IssueStockConsumer.name);
  readonly name = 'issue-stock.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'issue-stock' && event.payload.action_id !== 'issue-stock') {
      return;
    }

    const tenant_id = event.payload.tenant_id; const data = event.payload.payload as any;
    if (!data?.inventoryItemId || !data?.quantity) {
      this.logger.warn(`Missing issue stock details for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Issuing stock for item ${data.inventoryItemId} in tenant ${tenant_id}`);

    try {
      await this.prisma.executeWithTenant(tenant_id, 'system', async (tx: any) => {
        const item = await tx.inventoryItem.findFirst({
          where: { id: data.inventoryItemId, schoolId: tenant_id }
        });
        if (!item) {
          throw new Error('Inventory item not found or access denied');
        }

        if (data.issuedToDepartmentId) {
          const dept = await tx.department.findFirst({
            where: { id: data.issuedToDepartmentId, schoolId: tenant_id }
          });
          if (!dept) {
            throw new Error('Department not found or access denied');
          }
        }
        await tx.inventoryStockMovement.create({
          data: {
            schoolId: tenant_id,
            inventoryItemId: data.inventoryItemId,
            movementType: 'OUT',
            quantity: data.quantity,
            fromLocation: item.storageLocation,
            toLocation: data.toLocation || 'ISSUED',
            issuedToDepartmentId: data.issuedToDepartmentId || undefined,
          }
        });

        await tx.inventoryItem.update({
          where: { id: data.inventoryItemId },
          data: { quantityAvailable: item.quantityAvailable - data.quantity }
        });
      });
      this.logger.log(`Successfully issued stock for item ${data.inventoryItemId}`);
    } catch (error: any) {
      this.logger.error(`Failed to issue stock: ${error.message}`, error.stack);
      throw error;
    }
  }
}
