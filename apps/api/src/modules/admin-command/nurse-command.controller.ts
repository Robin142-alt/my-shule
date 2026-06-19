import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { NurseCommandService } from './nurse-command.service';

@Controller('admin-command/nurse')
@RequiresModule('clinic_health')
@Permissions('nurse:read')
export class NurseCommandController {
  constructor(private readonly service: NurseCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('visits')
  getVisits() {
    return this.service.getVisits();
  }

  @Get('dispensing-log')
  getDispensingLog() {
    return this.service.getDispensingLog();
  }

  @Get('medicine-inventory')
  getMedicineInventory() {
    return this.service.getMedicineInventory();
  }

  @Get('sick-bay-queue')
  getSickBayQueue() {
    return this.service.getSickBayQueue();
  }

  @Get('parent-notifications')
  getParentNotifications() {
    return this.service.getParentNotifications();
  }

  @Get('health-reports')
  getHealthReports() {
    return this.service.getHealthReports();
  }

  @Post('health-reports/generate')
  @Permissions('nurse:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
