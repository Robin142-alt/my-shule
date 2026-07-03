import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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

  @Post('visits')
  @Permissions('nurse:write')
  createVisit(@Body() dto: any) {
    return this.service.createVisit(dto);
  }

  @Post('visits/:id/close')
  @Permissions('nurse:write')
  closeVisit(@Param('id') id: string) {
    return this.service.closeVisit(id);
  }

  @Post('visits/:id/refer')
  @Permissions('nurse:write')
  referVisit(@Param('id') id: string, @Body() dto: any) {
    return this.service.referVisit(id, dto);
  }

  @Get('dispensing-log')
  getDispensingLog() {
    return this.service.getDispensingLog();
  }

  @Post('dispensing-log')
  @Permissions('nurse:write')
  dispenseMedicine(@Body() dto: any) {
    return this.service.dispenseMedicine(dto);
  }

  @Get('medicine-inventory')
  getMedicineInventory() {
    return this.service.getMedicineInventory();
  }

  @Post('medicine-inventory')
  @Permissions('nurse:write')
  addMedicineStock(@Body() dto: any) {
    return this.service.addMedicineStock(dto);
  }

  @Post('medicine-inventory/:id/adjust')
  @Permissions('nurse:write')
  adjustMedicineStock(@Param('id') id: string, @Body() dto: any) {
    return this.service.adjustMedicineStock(id, dto);
  }

  @Get('sick-bay-queue')
  getSickBayQueue() {
    return this.service.getSickBayQueue();
  }

  @Post('sick-bay-queue')
  @Permissions('nurse:write')
  admitToSickBay(@Body() dto: any) {
    return this.service.admitToSickBay(dto);
  }

  @Post('sick-bay-queue/:id/discharge')
  @Permissions('nurse:write')
  dischargeFromSickBay(@Param('id') id: string) {
    return this.service.dischargeFromSickBay(id);
  }

  @Get('parent-notifications')
  getParentNotifications() {
    return this.service.getParentNotifications();
  }

  @Post('parent-notifications')
  @Permissions('nurse:write')
  sendParentNotification(@Body() dto: any) {
    return this.service.sendParentNotification(dto);
  }

  @Post('parent-notifications/:id/resend')
  @Permissions('nurse:write')
  resendParentNotification(@Param('id') id: string) {
    return this.service.resendParentNotification(id);
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
