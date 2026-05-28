import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import {
  OperationalActionDispatchRequest,
  OperationalWorkflowDispatcherService,
} from './operational-workflow-dispatcher.service';

@Controller('operational-workflows')
export class OperationalWorkflowDispatcherController {
  constructor(
    private readonly operationalWorkflowDispatcher: OperationalWorkflowDispatcherService,
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
}
