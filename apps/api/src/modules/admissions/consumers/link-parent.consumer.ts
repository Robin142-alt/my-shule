import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class LinkParentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(LinkParentConsumer.name);
  readonly name = 'link-parent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'link-parent' && event.payload.action_id !== 'link-parent') {
      return;
    }

    const { tenant_id, data } = event.payload;
    if (!data?.studentId || !data?.guardianId) {
      this.logger.warn(`Missing studentId or guardianId for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Linking parent ${data.guardianId} to student ${data.studentId} for tenant ${tenant_id}`);

    try {
      await this.prisma.studentGuardian.create({
        data: {
          schoolId: tenant_id,
          studentId: data.studentId,
          guardianId: data.guardianId,
          relationshipType: data.relationshipType || 'GUARDIAN',
          isPrimaryContact: data.isPrimaryContact ?? true,
          canReceiveSms: data.canReceiveSms ?? true,
          canAccessParentPortal: data.canAccessParentPortal ?? true,
        }
      });
      this.logger.log(`Successfully linked parent to student`);
    } catch (error: any) {
      this.logger.error(`Failed to link parent: ${error.message}`, error.stack);
      throw error;
    }
  }
}
