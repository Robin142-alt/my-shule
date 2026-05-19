import { Body, Controller, Get, Post, Sse } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  CreateAdminIncidentDto,
  CreateAnnouncementDto,
  CreateMeetingMinutesDto,
} from './dto/admin-command.dto';
import { AdminCommandService } from './admin-command.service';

@Controller('admin-command')
@RequiresModule('admin_command_centers')
export class AdminCommandController {
  constructor(private readonly adminCommandService: AdminCommandService) {}

  @Get('principal/dashboard')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalDashboard() {
    return this.adminCommandService.getPrincipalDashboard();
  }

  @Sse('principal/dashboard/stream')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  streamPrincipalDashboard() {
    return this.adminCommandService.streamPrincipalDashboard();
  }

  @Get('deputy/dashboard')
  @Permissions('deputy:read')
  getDeputyDashboard() {
    return this.adminCommandService.getDeputyDashboard();
  }

  @Get('secretary/dashboard')
  @Permissions('secretary:read')
  getSecretaryDashboard() {
    return this.adminCommandService.getSecretaryDashboard();
  }

  @Post('incidents')
  @Permissions('deputy:write')
  createIncident(@Body() dto: CreateAdminIncidentDto) {
    return this.adminCommandService.createIncident(dto);
  }

  @Post('announcements')
  @Permissions('secretary:write')
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.adminCommandService.createAnnouncement(dto);
  }

  @Post('meeting-minutes')
  @Permissions('secretary:write')
  createMeetingMinutes(@Body() dto: CreateMeetingMinutesDto) {
    return this.adminCommandService.createMeetingMinutes(dto);
  }
}
