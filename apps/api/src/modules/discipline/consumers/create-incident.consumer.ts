import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CreateIncidentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(CreateIncidentConsumer.name);
  readonly name = 'create-incident.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'create-incident' && event.payload.action_id !== 'create-incident') {
      return;
    }

    const { tenant_id, data } = event.payload;
    if (!data?.studentId || !data?.description) {
      this.logger.warn(`Missing incident data for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Logging discipline incident for student ${data.studentId} in tenant ${tenant_id}`);

    try {
      const incident = await this.prisma.disciplineCase.create({
        data: {
          schoolId: tenant_id,
          studentId: data.studentId,
          reportedByUserId: data.reportedByUserId || 'system',
          caseNumber: data.caseNumber || `CAS-${Date.now()}`,
          incidentDate: data.incidentDate ? new Date(data.incidentDate) : new Date(),
          incidentType: data.incidentType || 'GENERAL_MISCONDUCT',
          severity: data.severity || 'LOW',
          description: data.description,
          status: 'OPEN',
        }
      });
      this.logger.log(`Successfully created discipline case ${incident.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to create discipline incident: ${error.message}`, error.stack);
      throw error;
    }
  }
}
