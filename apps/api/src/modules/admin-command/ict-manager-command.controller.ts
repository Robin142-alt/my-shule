import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { IctManagerCommandService } from './ict-manager-command.service';

@Controller('admin-command/ict-manager')
@RequiresModule('asset_tracking')
@Permissions('ict:read')
export class ICTManagerCommandController {
  constructor(private readonly service: IctManagerCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('assets')
  getAssets() {
    return this.service.getAssets();
  }

  @Get('asset-assignment')
  getAssetAssignment() {
    return this.service.getAssetAssignment();
  }

  @Get('loans-returns')
  getLoansReturns() {
    return this.service.getLoansReturns();
  }

  @Get('maintenance')
  getMaintenance() {
    return this.service.getMaintenance();
  }

  @Get('facilities-issues')
  getFacilitiesIssues() {
    return this.service.getFacilitiesIssues();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('ict:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
