import { Controller, Get } from '@nestjs/common';
import { SchoolSettingsService } from './school-settings.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('school')
export class SchoolController {
  constructor(private readonly schoolSettingsService: SchoolSettingsService) {}

  @Get('sms/wallet')
  @Permissions('settings:read')
  async getSmsWallet() {
    return this.schoolSettingsService.getSmsWallet();
  }

  @Get('modules/me')
  @Permissions('settings:read')
  async getMyModules() {
    return this.schoolSettingsService.getMyModules();
  }

  @Get('settings')
  @Permissions('settings:read')
  async getSettings() {
    return this.schoolSettingsService.getSettings();
  }
}
