import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { ApprovalChainService } from './approval-chain.service';
import {
  OperationalActionDispatchRequest,
  OperationalWorkflowDispatcherService,
} from './operational-workflow-dispatcher.service';

@Controller('operational-workflows')
export class OperationalWorkflowDispatcherController {
  constructor(
    private readonly operationalWorkflowDispatcher: OperationalWorkflowDispatcherService,
    private readonly approvalChainService: ApprovalChainService,
    private readonly requestContext: RequestContextService,
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
  async decideApproval(
    @Param('approvalId') approvalId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; decision_note?: string }
  ) {
    const store = this.requestContext.requireStore();
    await this.approvalChainService.processApproval({
      tenant_id: store.tenant_id!,
      approval_id: approvalId,
      approver_user_id: store.user_id,
      approver_role: store.role || 'UNKNOWN',
      decision: body.decision,
      decision_note: body.decision_note,
    });
    return { status: 'success' };
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
}
