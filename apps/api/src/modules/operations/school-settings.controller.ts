import { Body, Controller, Get, Patch, StreamableFile } from '@nestjs/common';
import { SchoolSettingsService } from './school-settings.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SkipResponseEnvelope } from '../../common/decorators/skip-response-envelope.decorator';

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

  @Get('identity')
  @Permissions('auth:read')
  async getIdentity() {
    return this.schoolSettingsService.getIdentity();
  }

  @Get('identity/logo')
  @Permissions('auth:read')
  @SkipResponseEnvelope()
  async getIdentityLogo() {
    const logo = await this.schoolSettingsService.getIdentityLogo();

    return new StreamableFile(logo.content, {
      type: logo.mime_type,
      disposition: `inline; filename="${logo.original_file_name}"`,
      length: logo.size_bytes,
    });
  }

  @Patch('profile')
  @Permissions('settings:write')
  async updateProfile(@Body() body: { address?: string; phone?: string; email?: string; motto?: string }) {
    return this.schoolSettingsService.updateProfile(body);
  }
}
