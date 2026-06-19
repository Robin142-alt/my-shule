import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class ApproveForPlacementConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-for-placement.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-for-placement' && event.payload.action_id !== 'approve-for-placement') {
      return;
    }

    const tenant_id = event.tenant_id || event.payload?.tenant_id;
    const aggregate_id = event.aggregate_id || event.payload?.aggregate_id || (event.payload?.payload as any)?.id;

    this.logger.logEvent(this.event_name, {
      consumer: 'ApproveForPlacementConsumer',
      tenant_id,
      aggregate_id,
      status: 'started',
    });

    try {
      if (aggregate_id) {
        const app = await this.prisma.admissionApplication.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (app) {
          let status: any = undefined;
          if (/approve|accept/i.test('ApproveForPlacementConsumer')) {
            status = 'ACCEPTED';
          } else if (/reject|decline/i.test('ApproveForPlacementConsumer')) {
            status = 'REJECTED';
          } else if (/cancel|void/i.test('ApproveForPlacementConsumer')) {
            status = 'CANCELLED';
          }
          if (status) {
            await this.prisma.admissionApplication.update({
              where: { id: app.id },
              data: { applicationStatus: status }
            });
          }
        } else {
          const student = await this.prisma.student.findFirst({
            where: { id: aggregate_id, schoolId: tenant_id }
          });
          if (student) {
            let status: any = undefined;
            if (/approve|accept|active|activate/i.test('ApproveForPlacementConsumer')) {
              status = 'ACTIVE';
            } else if (/reject|decline|suspend/i.test('ApproveForPlacementConsumer')) {
              status = 'SUSPENDED';
            }
            if (status) {
              await this.prisma.student.update({
                where: { id: student.id },
                data: { studentStatus: status }
              });
            }
          }
        }
      } else {
        await this.prisma.admissionApplication.findFirst({
          where: { schoolId: tenant_id }
        });
      }

      this.logger.logEvent(this.event_name, {
        consumer: 'ApproveForPlacementConsumer',
        tenant_id,
        aggregate_id,
        status: 'success',
      });
    } catch (error: any) {
      this.logger.error(`ApproveForPlacementConsumer failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
