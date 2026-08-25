import { Body, Controller, Get, Headers, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { CommunicationSmsService } from './communication-sms.service';

export class SendSmsDto {


  recipientPhone!: string;
  message!: string;
}

@Controller('communication')
@RequiresModule('communication_sms')
export class CommunicationController {
  constructor(private readonly prisma: PrismaService, private readonly db: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly smsService: CommunicationSmsService,
  ) {}

  @Post('sms')
  @Permissions('school_sms:send')
  async sendSms(
    @Body() dto: SendSmsDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    const userId = store.user_id;

    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    if (!userId) {
      throw new Error('User context required');
    }

    return this.smsService.sendSms({
      tenantId,
      userId,
      idempotencyKey,
      ...dto,
    });
  }

  @Get('sms')
  @Permissions('school_sms:read', 'school_communication:read')
  async getSms(@Query('limit') limit?: string) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new Error('Tenant context required');
    const parsedLimit = Number.parseInt(limit ?? '50', 10);
    return this.smsService.getSms(tenantId, Number.isFinite(parsedLimit) ? parsedLimit : 50);
  }

  @Get('summary')
  @Permissions('school_communication:read')
  async getSummary() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    const broadcasts = await this.prisma.communicationBroadcast.findMany({
      where: { schoolId: tenantId },
    });
    const total = broadcasts.length;
    const sent = broadcasts.filter((b) => b.status === 'SENT' || b.status === 'SUCCESS').length;
    const pending = broadcasts.filter((b) => b.status === 'PENDING').length;
    const failed = broadcasts.filter((b) => b.status === 'FAILED').length;

    const items = broadcasts.map((b) => ({
      id: b.id,
      date: b.createdAt.toISOString(),
      recipient: b.audience,
      channel: b.channels.join(', '),
      status: b.status,
    }));

    const res: any = {
      totalBroadcasts: total,
      metrics: {
        total,
        sent,
        pending,
        failed,
      },
      items,
      length: items.length,
      map: (fn: any) => items.map(fn),
      forEach: (fn: any) => items.forEach(fn),
      filter: (fn: any) => items.filter(fn),
    };
    return res;
  }

  @Get('messages')
  @Permissions('school_communication:read')
  async getMessages() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    const broadcasts = await this.prisma.communicationBroadcast.findMany({
      where: { schoolId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return broadcasts.map((b) => ({
      id: b.id,
      date: b.createdAt.toISOString(),
      recipient: b.audience,
      channel: b.channels.join(', '),
      message_type: 'Broadcast',
      status: b.status,
      sent_by: b.userId,
      message: b.message,
    }));
  }

  @Patch('broadcasts/:id/cancel')
  @Permissions('school_sms:send')
  async cancelBroadcast(@Param('id') id: string) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    if (!tenantId) throw new Error('Tenant context required');

    const result = await this.prisma.communicationBroadcast.updateMany({
      where: {
        id,
        schoolId: tenantId,
        status: { in: ['PENDING', 'SCHEDULED', 'DRAFT'] },
      },
      data: { status: 'CANCELLED' },
    });

    if (result.count === 0) {
      throw new NotFoundException('Scheduled broadcast was not found for this school or cannot be cancelled');
    }

    return { success: true, message: 'Broadcast cancelled', data: { id, status: 'CANCELLED' } };
  }
}
