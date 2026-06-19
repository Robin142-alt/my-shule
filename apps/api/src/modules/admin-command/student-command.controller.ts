import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { StudentCommandService } from './student-command.service';

@Controller('admin-command/student')
@Permissions('student:read')
export class StudentCommandController {
  constructor(private readonly service: StudentCommandService) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('downloads')
  getDownloads() {
    return this.service.getDownloads();
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
