import { Body, Controller, Get, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DeviceRegistrationResponseDto } from './dto/device-registration-response.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { SyncPullResponseDto } from './dto/sync-pull-response.dto';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncPushResponseDto } from './dto/sync-push-response.dto';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('devices/register')
  @Permissions('auth:read')
  async registerDevice(
    @Body() dto: RegisterDeviceDto,
  ): Promise<DeviceRegistrationResponseDto> {
    return this.syncService.registerDevice(dto);
  }

  @Post('push')
  @Permissions('finance:write')
  async push(@Body() dto: SyncPushDto): Promise<SyncPushResponseDto> {
    return this.syncService.push(dto);
  }

  @Post('pull')
  @Permissions('finance:read', 'attendance:read')
  async pull(@Body() dto: SyncPullDto): Promise<SyncPullResponseDto> {
    return this.syncService.pull(dto);
  }

  @Get('status')
  @Permissions('finance:read', 'attendance:read')
  async status() {
    return this.syncService.getStatus();
  }

  @Post('retry')
  @Permissions('finance:write', 'attendance:write')
  async retry(@Body() dto: any) {
    return this.syncService.retry(dto);
  }

  @Post('resolve-conflict')
  @Permissions('finance:write', 'attendance:write')
  async resolveConflict(@Body() dto: any) {
    return this.syncService.resolveConflict(dto);
  }
}
