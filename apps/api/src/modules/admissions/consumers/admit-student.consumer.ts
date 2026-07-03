import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

    const { tenant_id } = event.payload;
    const data = event.payload.payload as any;
    this.logger.log(`Executing admit-student for tenant ${tenant_id}`);

    try {
      const firstName = this.requireText(data?.firstName, 'firstName');
      const lastName = this.requireText(data?.lastName, 'lastName');
      const admissionNumber = this.requireText(data?.admissionNumber, 'admissionNumber');
      const gender = this.requireText(data?.gender, 'gender');
      const dateOfBirth = data?.dateOfBirth ? new Date(data.dateOfBirth) : null;

      if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) {
        throw new BadRequestException('dateOfBirth is required for admit-student');
      }

      const student = await this.prisma.student.create({
        data: {
          schoolId: tenant_id,
          firstName,
          lastName,
          admissionNumber,
          gender,
          dateOfBirth,
          nationality: data?.nationality || 'Kenyan',
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

  private requireText(value: unknown, fieldName: string): string {
    const text = typeof value === 'string' ? value.trim() : '';

    if (!text) {
      throw new BadRequestException(`${fieldName} is required for admit-student`);
    }

    return text;
  }
}
