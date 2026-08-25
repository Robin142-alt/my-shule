import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import {
  SCHOOL_EVENT_PUBLISHER_ROLE_CODES,
  SCHOOL_STAFF_ROLE_CODES,
} from '../../../auth/auth.constants';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import {
  CreateWorkflowEventInput,
  WorkflowPrincipal,
  WorkflowService,
} from '../services/workflow.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('workflow/events')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Permissions('events:read')
  @Get()
  async getEvents(
    @Query('limit') rawLimit?: string,
    @Query('offset') rawOffset?: string,
  ) {
    return this.workflowService.listEvents(
      this.requirePrincipal(),
      this.parseInteger(rawLimit, 50, 1, 100, 'limit'),
      this.parseInteger(rawOffset, 0, 0, 10_000, 'offset'),
    );
  }

  @Permissions('events:publish')
  @Roles(...SCHOOL_EVENT_PUBLISHER_ROLE_CODES)
  @Post()
  async createEvent(@Body() input: CreateWorkflowEventInput) {
    return this.workflowService.createWorkflowEvent(input, this.requirePrincipal());
  }

  @Permissions('events:publish')
  @Roles(...SCHOOL_EVENT_PUBLISHER_ROLE_CODES)
  @Post(':id/dispatch')
  async dispatchEvent(@Param('id') id: string) {
    return this.workflowService.dispatchWorkflowEvent(id, this.requirePrincipal());
  }

  @Permissions('events:write')
  @Roles(...SCHOOL_STAFF_ROLE_CODES)
  @Post(':id/handled')
  async markHandled(@Param('id') id: string) {
    return this.workflowService.markEventHandled(id, this.requirePrincipal());
  }

  private requirePrincipal(): WorkflowPrincipal {
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

  private parseInteger(
    value: string | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
    label: string,
  ): number {
    if (value === undefined || value === '') {
      return fallback;
    }
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${label} must be a whole number`);
    }
    const parsed = Number.parseInt(value, 10);
    if (parsed < minimum || parsed > maximum) {
      throw new BadRequestException(`${label} must be between ${minimum} and ${maximum}`);
    }
    return parsed;
  }
}
