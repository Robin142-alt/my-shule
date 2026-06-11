import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { AuditTrailService } from './audit-trail.service';

@Controller('workflow/audit')
export class AuditTrailController {
  constructor(
    private readonly auditTrailService: AuditTrailService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('recent')
  @Permissions('platform:audit-read')
  async getRecentAuditLogs(@Query('limit') limit?: number) {
    const store = this.requestContext.requireStore();
    return this.auditTrailService.getRecentAuditLogs(store.tenant_id!, limit ? Number(limit) : 50);
  }

  @Get('aggregate/:aggregateId')
  @Permissions('platform:audit-read')
  async getAuditLogsForAggregate(@Param('aggregateId') aggregateId: string) {
    const store = this.requestContext.requireStore();
    return this.auditTrailService.getAuditLogsForAggregate(store.tenant_id!, aggregateId);
  }
}
