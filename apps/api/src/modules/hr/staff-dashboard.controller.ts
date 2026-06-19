import { Controller, Get, UseGuards } from '@nestjs/common';
import { StaffDashboardService } from './staff-dashboard.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffDashboardService: StaffDashboardService) {}

  @Get('dashboard')
  @Permissions('hr:read')
  getStaffDashboard() {
    return this.staffDashboardService.getStaffDashboard();
  }
}
