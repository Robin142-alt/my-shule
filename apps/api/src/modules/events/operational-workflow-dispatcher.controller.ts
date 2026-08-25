import {
  Body,
  Controller,
  Get,
  GoneException,
  Param,
  Post,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import {
  OperationalWorkflowDispatcherService,
  OperationalActionDispatchRequest,
} from './operational-workflow-dispatcher.service';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('operational-workflows')
export class OperationalWorkflowDispatcherController {
  constructor(
    private readonly operationalWorkflowDispatcher: OperationalWorkflowDispatcherService,
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('principal/catalog')
  @Permissions('platform:operational-execute')
  getPrincipalCatalog() {
    return this.operationalWorkflowDispatcher.getPrincipalCatalog();
  }

  @Post('principal/actions/:actionId/dispatch')
  @Permissions('platform:operational-execute')
  dispatchPrincipalAction(
    @Param('actionId') actionId: string,
    @Body() body: OperationalActionDispatchRequest,
  ) {
    return this.operationalWorkflowDispatcher.dispatchPrincipalAction(actionId, body);
  }

  @Post('roles/:role/actions/:actionId/dispatch')
  @Permissions('platform:operational-execute')
  dispatchRuntimeRoleAction(
    @Param('role') role: string,
    @Param('actionId') actionId: string,
    @Body() body: OperationalActionDispatchRequest,
  ) {
    return this.operationalWorkflowDispatcher.dispatchRuntimeRoleAction(
      role,
      actionId,
      body,
    );
  }

  @Post('approvals/:approvalId/decide')
  @Permissions('platform:operational-execute')
  decideApproval(
    @Param('approvalId') _approvalId: string,
    @Body() _body: { decision: 'APPROVED' | 'REJECTED'; decision_note?: string }
  ) {
    throw new GoneException({
      code: 'LEGACY_APPROVAL_ROUTE_DISABLED',
      message: 'This legacy approval route is disabled. Use the canonical approval approve or reject route.',
      canonical_routes: [
        'POST /approvals/:id/approve',
        'POST /approvals/:id/reject',
      ],
    });
  }

  @Post('offline-sync')
  @Permissions('platform:operational-execute')
  async syncOfflineAction(
    @Body() body: { action_id: string; workflow_binding: string; aggregate_id: string; payload: any }
  ) {
    const store = this.requestContext.requireStore();
    return this.operationalWorkflowDispatcher.dispatchRuntimeRoleAction(
      store.role || 'UNKNOWN',
      body.action_id,
      {
        aggregateId: body.aggregate_id,
        payload: {
          ...body.payload,
          runtimeActionContract: {
            workflowBinding: body.workflow_binding,
            executionHandler: 'default',
            auditEvent: 'offline.sync.action.dispatched',
            eventContract: ['workflow.action.dispatched'],
            retryPolicy: 'RETRY',
            fallbackHandler: 'default'
          }
        },
      }
    );
  }

  @Get('offline-sync')
  @Permissions('platform:operational-execute')
  async getOfflineSync() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      return { pending: 0, synced: 0, failed: 0, conflicts: 0, status: 'operational' };
    }

    try {
      const result = await this.prisma.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM sync_operation_logs
         WHERE tenant_id::text = $1::text`,
        [tenantId],
      );
      const syncedCount = result.rows[0]?.count ?? 0;
      return {
        pending: 0,
        synced: syncedCount,
        failed: 0,
        conflicts: 0,
        status: 'operational',
      };
    } catch (e: any) {
      console.error('getOfflineSync error:', e);
      throw new InternalServerErrorException(e.message || 'Database error occurred');
    }
  }
}
