import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApprovalService, CreateApprovalRequestInput } from '../services/approval.service';
import { PrismaService } from '../../../database/prisma.service';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { UnauthorizedException } from '@nestjs/common';

@Controller('approvals')
export class ApprovalController {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
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

  constructor(private readonly prisma: PrismaService, private readonly approvalService: ApprovalService,
    private readonly db: PrismaService
  ) {}

  @Permissions('auth:read')
  @Get()
  async getApprovals(@Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const result = await this.db.query(
      `SELECT * FROM approval_requests WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return result.rows;
  }

  @Permissions('auth:read')
  @Post()
  async createApproval(@Body() input: CreateApprovalRequestInput) {
    return this.approvalService.createApprovalRequest(input);
  }

  @Permissions('auth:read')
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    return this.approvalService.approveRequest({
      schoolId: tenantId,
      approvalId: id,
      approvedByUserId: body.userId,
      comment: body.comment
    });
  }

  @Permissions('auth:read')
  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    return this.approvalService.rejectRequest({
      schoolId: tenantId,
      approvalId: id,
      rejectedByUserId: body.userId,
      reason: body.reason
    });
  }
}

