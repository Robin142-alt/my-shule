import { Controller, Get, Post, Param, Body, UseGuards, Req, Patch, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsExecutor } from './approvals.executor';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ApprovalStatus } from '@prisma/client';

import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('api/approvals')
@UseGuards(JwtAuthGuard)
@Permissions('approvals:*')
export class ApprovalsController {
  constructor(
    private readonly approvalsService: ApprovalsService,
    private readonly approvalsExecutor: ApprovalsExecutor,
    private readonly db: PrismaService,
  ) {}

  @Get('rules')
  async getRules(@Req() req: any) {
    const { schoolId } = req.user;
    const rules = await this.approvalsService.getRules(schoolId);
    return { success: true, data: rules };
  }

  @Post('rules')
  async createRule(@Req() req: any, @Body() body: any) {
    const { schoolId } = req.user;
    const rule = await this.approvalsService.createRule(schoolId, body);
    return { success: true, data: rule };
  }

  @Patch('rules/:id')
  async updateRule(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const { schoolId } = req.user;
    const rule = await this.approvalsService.updateRule(schoolId, id, body);
    return { success: true, data: rule };
  }

  @Get('pending')
  async getPendingApprovals(@Req() req: any) {
    const { schoolId, userId, role } = req.user;
    // Basic filter fetching all pending for the school. In a real scenario, filter strictly by user's role.
    const requests = await this.approvalsService.getPendingApprovals(schoolId, role);
    return { success: true, data: requests };
  }

  @Get('my-requests')
  async getMyRequests(@Req() req: any) {
    const { schoolId, userId } = req.user;
    const requests = await this.approvalsService.getMyRequests(schoolId, userId);
    return { success: true, data: requests };
  }

  @Patch(':id/action')
  async processApprovalAction(
    @Param('id') requestId: string,
    @Body() body: { action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'ESCALATE'; comment?: string },
    @Req() req: any
  ) {
    const { schoolId, userId, role } = req.user;

    const request = await this.db.approvalRequest.findUnique({
      where: { id: requestId, schoolId },
    });

    if (!request) throw new NotFoundException('Approval request not found');

    if (request.status !== ApprovalStatus.PENDING_APPROVAL && request.status !== ApprovalStatus.ESCALATED) {
      throw new BadRequestException(`Cannot process request in state ${request.status}`);
    }

    // Determine new status based on action
    let newStatus: ApprovalStatus;
    switch (body.action) {
      case 'APPROVE': newStatus = ApprovalStatus.APPROVED; break;
      case 'REJECT': newStatus = ApprovalStatus.REJECTED; break;
      case 'REQUEST_CHANGES': newStatus = ApprovalStatus.CHANGES_REQUESTED; break;
      case 'ESCALATE': newStatus = ApprovalStatus.ESCALATED; break;
      default: throw new BadRequestException('Invalid action');
    }

    const updated = await this.db.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        approverComment: body.comment,
        assignedApproverId: userId,
        assignedApproverRole: role,
        approvedAt: newStatus === ApprovalStatus.APPROVED ? new Date() : undefined,
        rejectedAt: newStatus === ApprovalStatus.REJECTED ? new Date() : undefined,
        escalatedAt: newStatus === ApprovalStatus.ESCALATED ? new Date() : undefined,
        auditLogs: {
          create: {
            schoolId,
            userId,
            action: body.action,
            comment: body.comment,
            previousStatus: request.status,
            newStatus,
          }
        }
      }
    });

    // If approved, trigger the executor to apply the actual change
    if (newStatus === ApprovalStatus.APPROVED) {
      // Create an execution context based on what the original requested action was
      const executionContext = {
        schoolId: request.schoolId,
        targetEntityType: request.targetEntityType,
        targetEntityId: request.targetEntityId,
        oldValue: request.oldValue,
        newValue: request.newValue,
        requestedByUserId: request.requestedByUserId,
        approvedByUserId: userId,
      };

      // Call the module's registered execution handler.
      // E.g., if module='FINANCE' and action='FEE_WAIVER', Finance module handles it.
      await this.approvalsExecutor.execute(request.module, request.action, executionContext);
    }

    return { success: true, data: updated };
  }
}
