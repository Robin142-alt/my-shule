import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class AssignInvestigatorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-investigator.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-investigator' && event.payload.action_id !== 'assign-investigator') {
      return;
    }

    const tenant_id = event.tenant_id || event.payload?.tenant_id;
    const aggregate_id = event.aggregate_id || event.payload?.aggregate_id || (event.payload?.payload as any)?.id;

    this.logger.logEvent(this.event_name, {
      consumer: 'AssignInvestigatorConsumer',
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
          if (/approve|accept|resolve|close/i.test('AssignInvestigatorConsumer')) {
            status = 'CLOSED';
          } else if (/review/i.test('AssignInvestigatorConsumer')) {
            status = 'UNDER_REVIEW';
          } else if (/refer/i.test('AssignInvestigatorConsumer')) {
            status = 'REFERRED';
          } else if (/issue|action/i.test('AssignInvestigatorConsumer')) {
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
            if (/approve|accept|resolve|close/i.test('AssignInvestigatorConsumer')) {
              status = 'RESOLVED';
            } else if (/review/i.test('AssignInvestigatorConsumer')) {
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
        consumer: 'AssignInvestigatorConsumer',
        tenant_id,
        aggregate_id,
        status: 'success',
      });
    } catch (error: any) {
      this.logger.error(`AssignInvestigatorConsumer failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
