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

    const tenant_id = event.payload.tenant_id; const data = event.payload.payload as any;
    if (!data?.studentId || !data?.amount || !data?.paymentReference) {
      this.logger.warn(`Missing payment details for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Recording payment ${data.paymentReference} for student ${data.studentId} in tenant ${tenant_id}`);

    try {
      await this.prisma.executeWithTenant(tenant_id, data.receivedByUserId || 'system', async (tx: any) => {
        // Verify student exists and belongs to tenant_id
        const student = await tx.student.findFirst({
          where: { id: data.studentId, schoolId: tenant_id }
        });
        if (!student) {
          throw new Error('Student not found or access denied');
        }

        let invoice: any = null;
        if (data.invoiceId) {
          invoice = await tx.invoice.findFirst({
            where: { id: data.invoiceId, schoolId: tenant_id }
          });
          if (!invoice || invoice.studentId !== data.studentId) {
            throw new Error('Invoice not found or access denied');
          }
        }

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
      });
      this.logger.log(`Successfully recorded payment ${data.paymentReference}`);
    } catch (error: any) {
      this.logger.error(`Failed to record payment: ${error.message}`, error.stack);
      throw error;
    }
  }
}
