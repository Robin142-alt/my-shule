import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PublishReportCardsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(PublishReportCardsConsumer.name);
  readonly name = 'publish-report-cards.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'publish-report-cards' && event.payload.action_id !== 'publish-report-cards') {
      return;
    }

    const tenant_id = event.payload.tenant_id; const data = event.payload.payload as any;
    if (!data?.examCycleId) {
      this.logger.warn(`Missing examCycleId for publishing report cards in tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Publishing report cards for Exam Cycle ${data.examCycleId} in tenant ${tenant_id}`);

    try {
      await this.prisma.examCycle.update({
        where: { id: data.examCycleId, schoolId: tenant_id },
        data: { status: 'RELEASED' }
      });
      
      // Also update all related ReportCards
      await this.prisma.reportCard.updateMany({
        where: { examCycleId: data.examCycleId, schoolId: tenant_id },
        data: { status: 'RELEASED' }
      });

      this.logger.log(`Successfully published report cards for Exam Cycle ${data.examCycleId}`);
    } catch (error: any) {
      this.logger.error(`Failed to publish report cards: ${error.message}`, error.stack);
      throw error;
    }
  }
}
