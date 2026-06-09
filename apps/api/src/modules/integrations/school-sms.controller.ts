import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  CreateSmsPurchaseRequestDto,
  SendBulkSmsDto,
  SendSmsDto,
} from './dto/integrations.dto';
import { SchoolSmsWalletService } from './school-sms-wallet.service';

@Controller()
@RequiresModule('communication_sms')
export class SchoolSmsController {
  constructor(private readonly schoolSmsWalletService: SchoolSmsWalletService) {}

  @Get('school/sms/wallet')
  @Permissions('school_sms:read')
  getWallet() {
    return this.schoolSmsWalletService.getWallet();
  }

  @Get('school/sms/logs')
  @Permissions('school_sms:read')
  listLogs(@Query('limit') limit?: string) {
    return this.schoolSmsWalletService.listLogs(limit ? Number(limit) : undefined);
  }

  @Get('sms/readiness')
  @Permissions('school_sms:read')
  getReadiness() {
    return this.schoolSmsWalletService.getReadiness();
  }

  @Post('school/sms/purchase-requests')
  @Permissions('school_sms:purchase')
  createPurchaseRequest(@Body() dto: CreateSmsPurchaseRequestDto) {
    return this.schoolSmsWalletService.createPurchaseRequest(dto);
  }

  @Post('sms/send')
  @Permissions('school_sms:send')
  sendSms(@Body() dto: SendSmsDto) {
    return this.schoolSmsWalletService.sendSms(dto);
  }

  @Post('sms/bulk-send')
  @Permissions('school_sms:send')
  sendBulkSms(@Body() dto: SendBulkSmsDto) {
    return this.schoolSmsWalletService.sendBulkSms(dto);
  }
}
