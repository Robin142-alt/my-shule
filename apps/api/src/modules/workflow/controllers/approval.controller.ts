import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApprovalService, CreateApprovalRequestInput } from '../services/approval.service';
import { DatabaseService } from '../../../database/database.service';

@Controller('approvals')
export class ApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly db: DatabaseService
  ) {}

  @Get()
  async getApprovals(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const result = await this.db.query(
      `SELECT * FROM approval_requests WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return result.rows;
  }

  @Post()
  async createApproval(@Body() input: CreateApprovalRequestInput) {
    return this.approvalService.createApprovalRequest(input);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.approvalService.approveRequest({
      schoolId: tenantId,
      approvalId: id,
      approvedByUserId: body.userId,
      comment: body.comment
    });
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.approvalService.rejectRequest({
      schoolId: tenantId,
      approvalId: id,
      rejectedByUserId: body.userId,
      reason: body.reason
    });
  }
}
