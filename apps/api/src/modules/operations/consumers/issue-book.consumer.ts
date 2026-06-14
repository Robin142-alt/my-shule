import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class IssueBookConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(IssueBookConsumer.name);
  readonly name = 'issue-book.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'issue-book' && event.payload.action_id !== 'issue-book') {
      return;
    }

    const tenant_id = event.payload.tenant_id; const data = event.payload.payload as any;
    if (!data?.bookCopyId || (!data?.studentId && !data?.staffUserId) || !data?.dueAt) {
      this.logger.warn(`Missing issue book details for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Issuing book copy ${data.bookCopyId} in tenant ${tenant_id}`);

    try {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.libraryLoan.create({
          data: {
            schoolId: tenant_id,
            bookCopyId: data.bookCopyId,
            studentId: data.studentId || undefined,
            staffUserId: data.staffUserId || undefined,
            issuedByUserId: data.issuedByUserId || 'system',
            issuedAt: new Date(),
            dueAt: new Date(data.dueAt),
            status: 'ISSUED',
          }
        });
        
        await tx.libraryBookCopy.update({
          where: { id: data.bookCopyId },
          data: { status: 'BORROWED' }
        });
      });
      this.logger.log(`Successfully issued book copy ${data.bookCopyId}`);
    } catch (error: any) {
      this.logger.error(`Failed to issue book: ${error.message}`, error.stack);
      throw error;
    }
  }
}
