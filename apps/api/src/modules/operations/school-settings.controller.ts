import { Body, Controller, Get, Patch } from '@nestjs/common';
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

  @Patch('profile')
  @Permissions('settings:write')
  async updateProfile(@Body() body: { address?: string; phone?: string; email?: string; motto?: string }) {
    return this.schoolSettingsService.updateProfile(body);
  }
}
