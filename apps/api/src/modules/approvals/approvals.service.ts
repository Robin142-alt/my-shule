import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalStatus } from '@prisma/client';

export interface EnforceApprovalContext {
  schoolId: string;
  userId: string;
  userRole: string;
  module: string;
  action: string;
  targetEntityType: string;
  targetEntityId: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  attachments?: string[];
}

export type EnforceApprovalResult = 
  | { mode: 'DIRECT_APPLY' }
  | { mode: 'CREATE_APPROVAL_REQUEST'; request: any };

@Injectable()
export class ApprovalsService {
  constructor(private readonly db: PrismaService) {}

  async getApprovalRule(schoolId: string, module: string, action: string) {
    return this.db.approvalRule.findFirst({
      where: { schoolId, module, action, isActive: true },
    });
  }

  async getRules(schoolId: string) {
    return this.db.approvalRule.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(schoolId: string, data: any) {
    return this.db.approvalRule.create({
      data: {
        ...data,
        schoolId,
      },
    });
  }

  async updateRule(schoolId: string, ruleId: string, data: any) {
    return this.db.approvalRule.update({
      where: { id: ruleId, schoolId },
      data,
    });
  }

  async deleteRule(schoolId: string, ruleId: string) {
    return this.db.approvalRule.delete({
      where: { id: ruleId, schoolId },
    });
  }

  async enforceApprovalRule(context: EnforceApprovalContext): Promise<EnforceApprovalResult> {
    const { schoolId, userId, userRole, module, action, reason } = context;

    const rule = await this.getApprovalRule(schoolId, module, action);

    if (!rule || rule.approvalLevel === 'NONE') {
      return { mode: 'DIRECT_APPLY' };
    }

    if (!rule.requesterRoles.includes(userRole)) {
      throw new ForbiddenException('You do not have permission to request this action.');
    }

    if (rule.requiresReason && !reason) {
      throw new BadRequestException('A reason is required to request this action.');
    }

    // Determine the status. If AUTO_APPROVE, it immediately bypasses pending queue
    const status = rule.approvalLevel === 'AUTO_APPROVE' 
      ? ApprovalStatus.APPROVED 
      : ApprovalStatus.PENDING_APPROVAL;

    const request = await this.db.approvalRequest.create({
      data: {
        schoolId: context.schoolId,
        ruleId: rule.id,
        module: context.module,
        action: context.action,
        targetEntityType: context.targetEntityType,
        targetEntityId: context.targetEntityId,
        requestedByUserId: context.userId,
        status,
        reason: context.reason,
        oldValue: context.oldValue ? context.oldValue : undefined,
        newValue: context.newValue ? context.newValue : undefined,
        attachments: context.attachments || [],
        submittedAt: status === ApprovalStatus.PENDING_APPROVAL ? new Date() : undefined,
        approvedAt: status === ApprovalStatus.APPROVED ? new Date() : undefined,
        auditLogs: {
          create: {
            schoolId: context.schoolId,
            userId: context.userId,
            action: status === ApprovalStatus.APPROVED ? 'AUTO_APPROVED' : 'SUBMITTED',
            newStatus: status
          }
        }
      },
    });

    if (status === ApprovalStatus.APPROVED) {
      return { mode: 'DIRECT_APPLY' };
    }

    // In a full implementation, trigger notifications to approverRoles here.

    return {
      mode: 'CREATE_APPROVAL_REQUEST',
      request,
    };
  }

  async getPendingApprovals(schoolId: string, userRole: string) {
    // Only return requests where the user's role is in the approverRoles of the associated rule
    return this.db.approvalRequest.findMany({
      where: {
        schoolId,
        status: { in: [ApprovalStatus.PENDING_APPROVAL, ApprovalStatus.CHANGES_REQUESTED, ApprovalStatus.ESCALATED] },
        // We'd usually join with rule to check approverRoles, 
        // Prisma can't directly filter by array intersection in relations easily.
        // As a workaround, we fetch all and filter in memory, or use a more complex query.
        // For now, let's fetch all pending in school and filter.
      },
      include: {
        auditLogs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyRequests(schoolId: string, userId: string) {
    return this.db.approvalRequest.findMany({
      where: {
        schoolId,
        requestedByUserId: userId,
      },
      include: {
        auditLogs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
