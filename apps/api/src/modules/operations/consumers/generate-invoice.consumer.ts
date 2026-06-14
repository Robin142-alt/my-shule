import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class GenerateInvoiceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(GenerateInvoiceConsumer.name);
  readonly name = 'generate-invoice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'generate-invoice' && event.payload.action_id !== 'generate-invoice') {
      return;
    }

    const tenant_id = event.payload.tenant_id; const data = event.payload.payload as any;
    if (!data?.studentId || !data?.amountDue || !data?.items) {
      this.logger.warn(`Missing invoice details for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Generating invoice for student ${data.studentId} in tenant ${tenant_id}`);

    try {
      await this.prisma.$transaction(async (tx: any) => {
        const invoice = await tx.invoice.create({
          data: {
            schoolId: tenant_id,
            studentId: data.studentId,
            academicYearId: data.academicYearId || 'temp-year',
            termId: data.termId || 'temp-term',
            invoiceNumber: data.invoiceNumber || `INV-${Date.now()}`,
            amountDue: data.amountDue,
            amountPaid: 0,
            balance: data.amountDue,
            status: 'ISSUED',
            dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
          }
        });

        if (Array.isArray(data.items)) {
          const itemsToInsert = data.items.map((item: any) => ({
            schoolId: tenant_id,
            invoiceId: invoice.id,
            feeItemName: item.name || 'General Fee',
            amount: item.amount || 0,
          }));
          await tx.invoiceItem.createMany({ data: itemsToInsert });
        }
      });
      this.logger.log(`Successfully generated invoice`);
    } catch (error: any) {
      this.logger.error(`Failed to generate invoice: ${error.message}`, error.stack);
      throw error;
    }
  }
}
