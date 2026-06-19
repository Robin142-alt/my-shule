import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class PrintCaseSummaryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-case-summary.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-case-summary' && event.payload.action_id !== 'print-case-summary') {
      return;
    }

    const tenant_id = event.tenant_id || event.payload?.tenant_id;
    const aggregate_id = event.aggregate_id || event.payload?.aggregate_id || (event.payload?.payload as any)?.id;

    this.logger.logEvent(this.event_name, {
      consumer: 'PrintCaseSummaryConsumer',
      tenant_id,
      aggregate_id,
      status: 'started',
    });

    try {
      if (aggregate_id) {
        const caseRecord = await this.prisma.disciplineCase.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (caseRecord) {
          let status: any = undefined;
          if (/approve|accept|resolve|close/i.test('PrintCaseSummaryConsumer')) {
            status = 'CLOSED';
          } else if (/review/i.test('PrintCaseSummaryConsumer')) {
            status = 'UNDER_REVIEW';
          } else if (/refer/i.test('PrintCaseSummaryConsumer')) {
            status = 'REFERRED';
          } else if (/issue|action/i.test('PrintCaseSummaryConsumer')) {
            status = 'ACTION_TAKEN';
          }
          if (status) {
            await this.prisma.disciplineCase.update({
              where: { id: caseRecord.id },
              data: { status }
            });
          }
        } else {
          const incident = await this.prisma.disciplineIncident.findFirst({
            where: { id: aggregate_id, tenant_id }
          });
          if (incident) {
            let status: any = undefined;
            if (/approve|accept|resolve|close/i.test('PrintCaseSummaryConsumer')) {
              status = 'RESOLVED';
            } else if (/review/i.test('PrintCaseSummaryConsumer')) {
              status = 'UNDER_REVIEW';
            }
            if (status) {
              await this.prisma.disciplineIncident.update({
                where: { id: incident.id },
                data: { status }
              });
            }
          }
        }
      } else {
        await this.prisma.disciplineCase.findFirst({
          where: { schoolId: tenant_id }
        });
      }

      this.logger.logEvent(this.event_name, {
        consumer: 'PrintCaseSummaryConsumer',
        tenant_id,
        aggregate_id,
        status: 'success',
      });
    } catch (error: any) {
      this.logger.error(`PrintCaseSummaryConsumer failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
