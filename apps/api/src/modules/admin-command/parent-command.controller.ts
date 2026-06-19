import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ParentCommandService } from './parent-command.service';

@Controller('admin-command/parent')
@Permissions('parent:read')
export class ParentCommandController {
  constructor(private readonly service: ParentCommandService) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('downloads')
  getDownloads() {
    return this.service.getDownloads();
  }

  @Get('health')
  getHealth() {
    return this.service.getHealth();
  }

  @Get('messages')
  getMessages() {
    return this.service.getMessages();
  }

  @Get('notifications')
  getNotifications() {
    return this.service.getNotifications();
  }
}
