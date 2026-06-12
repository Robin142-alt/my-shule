import { Injectable } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { VisitorsRepository } from './repositories/visitors.repository';

import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { Optional } from '@nestjs/common';

@Injectable()
export class VisitorsService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: VisitorsRepository,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) throw new Error('Tenant ID is required');
    return tenantId;
  }

  private get userId(): string {
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) return 'system';
    return userId;
  }

  async createAppointment(data: any) {
    return this.repository.createAppointment(this.tenantId, {
      ...data,
      created_by_user_id: this.userId,
    });
  }

  async listAppointments() {
    return this.repository.listAppointments(this.tenantId);
  }

  async logVisitor(data: any) {
    return this.repository.logVisitor(this.tenantId, {
      ...data,
      logged_by_user_id: this.userId,
    });
  }

  async listVisitorLogs() {
    return this.repository.listVisitorLogs(this.tenantId);
  }

  async checkOutVisitor(logId: string) {
    return this.repository.checkOutVisitor(this.tenantId, logId);
  }

  async logStudentExit(data: any) {
    const exit = await this.repository.logStudentExit(this.tenantId, {
      ...data,
      authorized_by_user_id: this.userId,
    });

    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: exit.id,
        type: 'visitor.student_exit',
        module: 'visitors',
        actorRole: this.requestContext.getStore()?.role || 'security',
        title: 'Student Exit Logged',
        body: `Student ${data.student_id} has exited the premises.`,
        entityId: exit.id,
        severity: 'info',
        payload: { student_id: data.student_id },
      },
      notifications: [
        {
          id: `student-exit-${exit.id}`,
          schoolId: this.tenantId,
          audienceRoles: ['boarding-master', 'principal'],
          title: 'Student Exited Premises',
          body: `Student ${data.student_id} has exited the school premises.`,
          sourceModule: 'visitors',
          relatedModule: 'boarding',
          relatedRecordId: exit.id,
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        }
      ]
    });

    return exit;
  }

  async listStudentExits() {
    return this.repository.listStudentExits(this.tenantId);
  }

  async returnStudent(exitId: string) {
    return this.repository.returnStudent(this.tenantId, exitId);
  }
}
