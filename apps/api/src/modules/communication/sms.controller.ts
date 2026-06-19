import { Body, Controller, Post, InternalServerErrorException } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Controller('sms')
@RequiresModule('communication_sms')
export class SmsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Post('send')
  @Permissions('school_sms:send')
  async sendSms(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      return { success: false };
    }

    const { phoneNumber, phone, message, msg } = body;
    const resolvedPhone = phoneNumber || phone || '';
    const resolvedMessage = message || msg || '';

    try {
      const smsLog = await this.prisma.smsLog.create({
        data: {
          schoolId: tenantId,
          phoneNumber: resolvedPhone,
          message: resolvedMessage,
          provider: 'MOCK_PROVIDER',
          providerMessageId: `MSG-${Date.now()}`,
          cost: 1.0,
          status: 'SENT',
        }
      });
      return { success: true, logId: smsLog.id };
    } catch (error: any) {
      console.error('sendSms error:', error);
      throw new InternalServerErrorException(error.message || 'Database error occurred');
    }
  }
}

