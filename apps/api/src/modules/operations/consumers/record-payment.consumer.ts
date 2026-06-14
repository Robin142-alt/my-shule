import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RecordPaymentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(RecordPaymentConsumer.name);
  readonly name = 'record-payment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'record-payment' && event.payload.action_id !== 'record-payment') {
      return;
    }

    const { tenant_id, data } = event.payload;
    if (!data?.studentId || !data?.amount || !data?.paymentReference) {
      this.logger.warn(`Missing payment details for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Recording payment ${data.paymentReference} for student ${data.studentId} in tenant ${tenant_id}`);

    try {
      await this.prisma.$transaction(async (tx: any) => {
        // Create payment
        await tx.payment.create({
          data: {
            schoolId: tenant_id,
            studentId: data.studentId,
            invoiceId: data.invoiceId || undefined,
            paymentReference: data.paymentReference,
            paymentMethod: data.paymentMethod || 'BANK',
            amount: data.amount,
            paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
            receivedByUserId: data.receivedByUserId || 'system',
            status: 'CONFIRMED',
            remarks: data.remarks || 'Payment received via portal',
          }
        });

        // Update invoice balance if applicable
        if (data.invoiceId) {
          const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
          if (invoice) {
            const newAmountPaid = invoice.amountPaid + data.amount;
            const newBalance = invoice.amountDue - newAmountPaid;
            const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                amountPaid: newAmountPaid,
                balance: newBalance > 0 ? newBalance : 0,
                status: newStatus
              }
            });
          }
        }
      });
      this.logger.log(`Successfully recorded payment ${data.paymentReference}`);
    } catch (error: any) {
      this.logger.error(`Failed to record payment: ${error.message}`, error.stack);
      throw error;
    }
  }
}
