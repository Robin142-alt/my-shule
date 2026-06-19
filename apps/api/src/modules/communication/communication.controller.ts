import { Body, Controller, Post, Get } from '@nestjs/common';

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
  async sendSms(@Body() dto: SendSmsDto) {
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
      ...dto,
    });
  }

  @Get('sms')
  @Permissions('school_sms:read', 'school_communication:read')
  async getSms() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new Error('Tenant context required');
    return this.smsService.getSms(tenantId);
  }

  @Get('summary')
  @Permissions('school_communication:read')
  async getSummary() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    try {
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
    } catch (e) {
      const emptyItems: any[] = [];
      return {
        totalBroadcasts: 0,
        metrics: { total: 0, sent: 0, pending: 0, failed: 0 },
        items: emptyItems,
        length: 0,
        map: (fn: any) => emptyItems.map(fn),
        forEach: (fn: any) => emptyItems.forEach(fn),
        filter: (fn: any) => emptyItems.filter(fn),
      };
    }
  }

  @Get('messages')
  @Permissions('school_communication:read')
  async getMessages() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    try {
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
    } catch (e) {
      return [];
    }
  }
}
