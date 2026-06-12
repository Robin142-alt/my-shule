import { Injectable, Optional } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService, SimpleOperationsRecordDto } from '../implementation100/simple-operations';
import { BoardingRepository } from './repositories/boarding.repository';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';

@Injectable()
export class BoardingService extends SimpleOperationsService {
  constructor(
    private readonly requestCtx: RequestContextService,
    repository: BoardingRepository,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
  ) {
    super(requestCtx, repository, {
      permissionPrefix: 'boarding',
      moduleName: 'Boarding',
      entityName: 'boarding',
      defaultStatus: 'active',
    });
  }

  override async createRecord(dto: SimpleOperationsRecordDto) {
    const record = await super.createRecord(dto);

    if (dto.category === 'late_return' || dto.title.toLowerCase().includes('late return')) {
      await this.schoolEvents?.recordSchoolOperation({
        event: {
          id: record.id,
          type: 'boarding.late_return',
          module: 'boarding',
          actorRole: this.requestCtx.getStore()?.role || 'boarding_master',
          title: 'Late Return Logged',
          body: `Student late return logged: ${dto.title}.`,
          entityId: record.id,
          severity: 'warning',
          payload: { category: 'late_return', student_id: dto.metadata?.student_id },
        },
        notifications: [
          {
            id: `boarding-late-${record.id}`,
            schoolId: this.requestCtx.getStore()?.tenant_id || 'unknown',
            audienceRoles: ['parent', 'discipline'],
            title: 'Student Late Return',
            body: `Student has been logged for late return to boarding. ${dto.notes || ''}`,
            sourceModule: 'boarding',
            relatedModule: 'discipline',
            relatedRecordId: record.id,
            priority: 'high',
            read: false,
            createdAt: new Date().toISOString(),
          }
        ]
      }).catch(() => undefined);
    }

    return record;
  }

  override async getDashboard() {
    const baseDashboard = await super.getDashboard();
    const tenantId = this.requestCtx.getStore()?.tenant_id;

    if (!tenantId) {
      return baseDashboard;
    }

    try {
      const db = (this as any).repository.databaseService;
      const [studentsRes, incidentsRes, leaveRes] = await Promise.all([
        db.query(`SELECT COUNT(*)::int as count FROM boarding_students WHERE tenant_id = $1 AND status = 'active'`, [tenantId]),
        db.query(`SELECT COUNT(*)::int as count FROM boarding_incidents WHERE tenant_id = $1 AND status = 'open'`, [tenantId]),
        db.query(`SELECT COUNT(*)::int as count FROM boarding_houses WHERE tenant_id = $1 AND category = 'leave'`, [tenantId]),
      ]);

      return {
        ...baseDashboard,
        total_boarders: studentsRes.rows[0]?.count || 0,
        open_incidents: incidentsRes.rows[0]?.count || 0,
        approved_leave: leaveRes.rows[0]?.count || 0,
      };
    } catch (e) {
      return baseDashboard;
    }
  }
}
