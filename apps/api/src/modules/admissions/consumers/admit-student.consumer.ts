import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AdmitStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(AdmitStudentConsumer.name);
  readonly name = 'admit-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'admit-student' && event.payload.action_id !== 'admit-student') {
      return;
    }

    const { tenant_id, data } = event.payload;
    this.logger.log(`Executing admit-student for tenant ${tenant_id}`);

    try {
      const student = await this.prisma.student.create({
        data: {
          schoolId: tenant_id,
          firstName: data?.firstName || 'Unknown',
          lastName: data?.lastName || 'Unknown',
          admissionNumber: data?.admissionNumber || `ADM-${Date.now()}`,
          gender: data?.gender || 'UNKNOWN',
          dateOfBirth: data?.dateOfBirth ? new Date(data.dateOfBirth) : new Date(),
          nationality: data?.nationality || 'Kenya',
          studentStatus: 'ACTIVE',
          admissionDate: new Date(),
          boardingStatus: data?.boardingStatus || 'DAY_SCHOLAR',
        }
      });

      this.logger.log(`Successfully admitted student ${student.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to admit student: ${error.message}`, error.stack);
      throw error; // Let the event dispatcher handle the retry/failure logic
    }
  }
}
