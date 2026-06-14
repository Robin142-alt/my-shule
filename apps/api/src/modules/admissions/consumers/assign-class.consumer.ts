import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AssignClassConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(AssignClassConsumer.name);
  readonly name = 'assign-class.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'assign-class' && event.payload.action_id !== 'assign-class') {
      return;
    }

    const { tenant_id } = event.payload;
    const data = event.payload.payload as any;
    if (!data?.studentId || (!data?.classId && !data?.streamId)) {
      this.logger.warn(`Missing studentId or class/stream assignment details for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Assigning class to student ${data.studentId} for tenant ${tenant_id}`);

    try {
      await this.prisma.student.update({
        where: { id: data.studentId, schoolId: tenant_id },
        data: {
          currentClassId: data.classId || undefined,
          currentStreamId: data.streamId || undefined,
        }
      });
      this.logger.log(`Successfully assigned student ${data.studentId} to class`);
    } catch (error: any) {
      this.logger.error(`Failed to assign class: ${error.message}`, error.stack);
      throw error;
    }
  }
}
