import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
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
  constructor(
    private readonly db: DatabaseService,
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
