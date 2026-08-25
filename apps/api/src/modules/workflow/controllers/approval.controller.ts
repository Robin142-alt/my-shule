import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { ApprovalService } from '../services/approval.service';

type ApprovalPrincipal = {
  tenantId: string;
  userId: string;
  role: string;
  requestId: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('approvals')
export class ApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Permissions('events:read')
  @Get()
  async getApprovals() {
    const principal = this.requirePrincipal();
    return this.approvalService.listPendingForApprover({
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
    });
  }

  @Permissions('users:write')
  @Post()
  async createApproval(@Body() body: Record<string, unknown>) {
    const principal = this.requirePrincipal();
    const legacyRoles = Array.isArray(body.approverRoles)
      ? body.approverRoles.filter((value): value is string => typeof value === 'string')
      : [];

    return this.approvalService.createApprovalRequest({
      tenantId: principal.tenantId,
      requestedByUserId: principal.userId,
      requestedByRole: principal.role,
      requestId: principal.requestId,
      approverRole: typeof body.approverRole === 'string' ? body.approverRole : legacyRoles[0] ?? null,
      approverUserId: typeof body.approverUserId === 'string' ? body.approverUserId : null,
      approvalType: typeof body.approvalType === 'string' ? body.approvalType : '',
      module: typeof body.module === 'string' ? body.module : null,
      recordId: typeof body.recordId === 'string'
        ? body.recordId
        : typeof body.entityId === 'string'
          ? body.entityId
          : null,
      title: typeof body.title === 'string' ? body.title : '',
      reason: typeof body.reason === 'string' ? body.reason : null,
      metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata as Record<string, unknown>
        : body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
          ? body.payload as Record<string, unknown>
          : {},
    });
  }

  @Permissions('events:write')
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const principal = this.requirePrincipal();
    return this.approvalService.decideRequest({
      tenantId: principal.tenantId,
      approvalId: id,
      actorUserId: principal.userId,
      actorRole: principal.role,
      requestId: principal.requestId,
      decision: 'APPROVED',
      note: typeof body.comment === 'string' ? body.comment : null,
    });
  }

  @Permissions('events:write')
  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const principal = this.requirePrincipal();
    return this.approvalService.decideRequest({
      tenantId: principal.tenantId,
      approvalId: id,
      actorUserId: principal.userId,
      actorRole: principal.role,
      requestId: principal.requestId,
      decision: 'REJECTED',
      note: typeof body.reason === 'string' ? body.reason : null,
    });
  }

  private requirePrincipal(): ApprovalPrincipal {
    const store = this.requestContext.requireStore();
    if (!store.is_authenticated || !store.tenant_id || !store.user_id || !store.role) {
      throw new UnauthorizedException('An authenticated school role is required');
    }
    if (!UUID_PATTERN.test(store.user_id)) {
      throw new UnauthorizedException('The authenticated school user is invalid');
    }

    return {
      tenantId: store.tenant_id,
      userId: store.user_id,
      role: store.role,
      requestId: store.request_id,
    };
  }
}
