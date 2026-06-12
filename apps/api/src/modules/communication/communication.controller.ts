import { Body, Controller, Post } from '@nestjs/common';

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
}
