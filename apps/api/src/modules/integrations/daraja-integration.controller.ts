import { Body, Controller, Get, Param, Post, Put, Query, ForbiddenException } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SaveDarajaIntegrationDto } from './dto/integrations.dto';
import { DarajaIntegrationService } from './daraja-integration.service';

@Controller('integrations/daraja')
export class DarajaIntegrationController {
  constructor(private readonly darajaIntegrationService: DarajaIntegrationService) {}

  @Get()
  @Permissions('daraja:read')
  getSettings(@Query('environment') environment?: string) {
    return this.darajaIntegrationService.getDarajaSettings(environment);
  }

  @Put()
  @Permissions('daraja:write')
  saveSettings(@Body() dto: SaveDarajaIntegrationDto) {
    throw new ForbiddenException('Use the approved school payment channel connection workflow');
  }

  @Post('test')
  @Permissions('daraja:test')
  testConnection(@Query('environment') environment?: string) {
    throw new ForbiddenException('Connection checks are available to Super Admin after Principal approval');
  }

  @Post(':integrationId/activate')
  @Permissions('daraja:write')
  activate(@Param('integrationId') integrationId: string) {
    throw new ForbiddenException('Use the approved school payment channel activation workflow');
  }

  @Post(':integrationId/deactivate')
  @Permissions('daraja:write')
  deactivate(@Param('integrationId') integrationId: string) {
    throw new ForbiddenException('Use payment integrations to suspend a channel with an audit reason');
  }
}
