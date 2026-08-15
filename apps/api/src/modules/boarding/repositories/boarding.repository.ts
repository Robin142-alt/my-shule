import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class BoardingRepository extends SimpleOperationsRepository {
  constructor(prisma: PrismaService) {
    super(prisma, {
      mainTable: 'boarding_houses',
      auditTable: 'boarding_audit_logs',
    });
  }

  async getOperationalMetrics(tenantId: string): Promise<{
    total_boarders: number;
    open_incidents: number;
    approved_leave: number;
  }> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{
        total_boarders: number;
        open_incidents: number;
        approved_leave: number;
      }>>(
        `
          SELECT
            (
              SELECT COUNT(*)::int
              FROM boarding_students
              WHERE tenant_id = $1 AND status = 'active'
            ) AS total_boarders,
            (
              SELECT COUNT(*)::int
              FROM boarding_incidents
              WHERE tenant_id = $1 AND status = 'open'
            ) AS open_incidents,
            (
              SELECT COUNT(*)::int
              FROM boarding_houses
              WHERE tenant_id = $1 AND category = 'leave' AND status = 'approved'
            ) AS approved_leave
        `,
        tenantId,
      );

      return rows[0] ?? {
        total_boarders: 0,
        open_incidents: 0,
        approved_leave: 0,
      };
    });
  }
}
