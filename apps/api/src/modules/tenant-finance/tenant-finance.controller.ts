import { Body, Controller, Get, Param, Patch, Post, Put, UnauthorizedException, ForbiddenException } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { RotateTenantMpesaCredentialsDto } from './dto/rotate-tenant-mpesa-credentials.dto';
import { UpsertTenantBankAccountDto } from './dto/upsert-tenant-bank-account.dto';
import { UpsertTenantMpesaConfigDto } from './dto/upsert-tenant-mpesa-config.dto';
import { UpdatePaymentChannelStatusDto } from './dto/update-payment-channel-status.dto';
import { TenantFinanceConfigService } from './tenant-finance-config.service';
import { TenantFinanceSummary, TenantMpesaGoLiveValidation } from './tenant-finance.types';

@Controller('tenant-finance')
@RequiresModule('finance')
export class TenantFinanceController {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly tenantFinanceConfigService: TenantFinanceConfigService,
  ) {}

  @Get('payment-channels')
  @Permissions('billing:read')
  async getPaymentChannels(): Promise<TenantFinanceSummary> {
    return this.tenantFinanceConfigService.getSummary(this.requireTenantId());
  }

  @Put('mpesa-config')
  @Permissions('billing:update')
  async upsertMpesaConfig(
    @Body() dto: UpsertTenantMpesaConfigDto,
  ): Promise<TenantFinanceSummary> {
    throw new ForbiddenException('Request a payment channel setup for Principal approval before technical connection');
  }

  @Get('mpesa-config/go-live')
  @Permissions('billing:read')
  async validateMpesaGoLive(): Promise<TenantMpesaGoLiveValidation> {
    return this.tenantFinanceConfigService.validateMpesaGoLive(this.requireTenantId());
  }

  @Post('mpesa-config/:configId/rotate-credentials')
  @Permissions('billing:update')
  async rotateMpesaCredentials(
    @Param('configId') configId: string,
    @Body() dto: RotateTenantMpesaCredentialsDto,
  ): Promise<TenantFinanceSummary> {
    throw new ForbiddenException('Credential changes require a new approved payment channel revision');
  }

  @Post('bank-accounts')
  @Permissions('billing:update')
  async upsertBankAccount(@Body() dto: UpsertTenantBankAccountDto): Promise<TenantFinanceSummary> {
    throw new ForbiddenException('Request a payment channel setup for Principal approval');
  }

  @Patch('payment-channels/:channelId/status')
  @Permissions('billing:update')
  async updatePaymentChannelStatus(
    @Param('channelId') channelId: string,
    @Body() dto: UpdatePaymentChannelStatusDto,
  ): Promise<TenantFinanceSummary> {
    throw new ForbiddenException('Only approved payment integrations can be activated by Super Admin');
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for finance settings');
    }

    return tenantId;
  }
}
