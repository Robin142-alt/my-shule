import { Body, Controller, Get, Post } from '@nestjs/common';

import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SecretaryService } from './secretary.service';

@Controller('api/secretary')
export class SecretaryController {
  constructor(
    private readonly secretaryService: SecretaryService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('queue')
  @Roles('SECRETARY', 'PRINCIPAL', 'DEPUTY_PRINCIPAL')
  async getQueueTickets() {
    return this.secretaryService.getQueueTickets(this.requireTenantId());
  }

  @Post('queue')
  @Roles('SECRETARY')
  async createQueueTicket(@Body() body: Record<string, unknown>) {
    const store = this.requestContext.requireStore();
    if (!store.user_id) {
      throw new Error('Authenticated user context required');
    }
    return this.secretaryService.createQueueTicket(this.requireTenantId(), store.user_id, body);
  }

  @Get('parent-requests')
  @Roles('SECRETARY', 'PRINCIPAL', 'DEPUTY_PRINCIPAL')
  async getParentRequests() {
    return this.secretaryService.getParentRequests(this.requireTenantId());
  }

  @Get('visitor-logs')
  @Roles('SECRETARY', 'SECURITY', 'PRINCIPAL')
  async getVisitorLogs() {
    return this.secretaryService.getVisitorLogs(this.requireTenantId());
  }

  @Get('calls')
  @Roles('SECRETARY', 'PRINCIPAL')
  async getCallLogs() {
    return this.secretaryService.getCallLogs(this.requireTenantId());
  }

  @Get('appointments')
  @Roles('SECRETARY', 'PRINCIPAL', 'DEPUTY_PRINCIPAL', 'TEACHER')
  async getAppointments() {
    return this.secretaryService.getAppointments(this.requireTenantId());
  }

  @Get('documents')
  @Roles('SECRETARY', 'PRINCIPAL')
  async getOfficeDocuments() {
    return this.secretaryService.getOfficeDocuments(this.requireTenantId());
  }

  @Post('visitors')
  @Roles('SECRETARY', 'SECURITY', 'PRINCIPAL')
  async logVisitor(@Body() body: Record<string, unknown>) {
    const store = this.requestContext.requireStore();
    if (!store.user_id) throw new Error('Authenticated user context required');
    return this.secretaryService.logVisitor(this.requireTenantId(), store.user_id, body);
  }

  @Post('appointments')
  @Roles('SECRETARY', 'PRINCIPAL', 'DEPUTY_PRINCIPAL')
  async scheduleAppointment(@Body() body: Record<string, unknown>) {
    const store = this.requestContext.requireStore();
    if (!store.user_id) throw new Error('Authenticated user context required');
    return this.secretaryService.scheduleAppointment(this.requireTenantId(), store.user_id, body);
  }

  @Post('mail')
  @Roles('SECRETARY', 'PRINCIPAL')
  async recordMail(@Body() body: Record<string, unknown>) {
    const store = this.requestContext.requireStore();
    if (!store.user_id) throw new Error('Authenticated user context required');
    return this.secretaryService.recordMail(this.requireTenantId(), store.user_id, body);
  }

  private requireTenantId(): string {
    const store = this.requestContext.requireStore();
    if (!store.tenant_id) {
      throw new Error('Tenant context required');
    }
    return store.tenant_id;
  }
}
