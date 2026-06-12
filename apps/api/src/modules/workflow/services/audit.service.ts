import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService as CoreAuditLogService } from '../../observability/audit-log.service';

export interface CreateAuditLogInput {
  schoolId: string;
  actorUserId: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService, private readonly db: PrismaService,
    private readonly coreAuditLogService: CoreAuditLogService
  ) {}

  async createAuditLog(input: CreateAuditLogInput) {
    // Wrap around the core observability AuditLogService to provide the requested signature
    await this.coreAuditLogService.record({
      tenant_id: input.schoolId,
      actor_user_id: input.actorUserId,
      action: input.action,
      resource_type: input.entityType,
      resource_id: input.entityId,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      metadata: {
        actorRole: input.actorRole,
        before: input.before,
        after: input.after,
      }
    });
  }
}
