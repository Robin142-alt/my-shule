import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Post('assets')
  @Permissions('ict:write')
  createAsset(@Body() dto: any) {
    return this.service.recordIctAction('asset.created', dto);
  }

  @Post('assets/:id/manage')
  @Permissions('ict:write')
  manageAsset(@Param('id') id: string, @Body() dto: any) {
    return this.service.manageAsset(id, dto);
  }

  @Get('asset-assignment')
  getAssetAssignment() {
    return this.service.getAssetAssignment();
  }

  @Post('asset-assignment')
  @Permissions('ict:write')
  assignAsset(@Body() dto: any) {
    return this.service.recordIctAction('asset-assignment.created', dto);
  }

  @Post('asset-assignment/:id/revoke')
  @Permissions('ict:write')
  revokeAssetAssignment(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordIctAction('asset-assignment.revoked', dto, id);
  }

  @Get('loans-returns')
  getLoansReturns() {
    return this.service.getLoansReturns();
  }

  @Post('loans-returns')
  @Permissions('ict:write')
  createLoan(@Body() dto: any) {
    return this.service.recordIctAction('loan.created', dto);
  }

  @Post('loans-returns/:id/return')
  @Permissions('ict:write')
  returnLoan(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordIctAction('loan.returned', dto, id);
  }

  @Get('maintenance')
  getMaintenance() {
    return this.service.getMaintenance();
  }

  @Post('maintenance')
  @Permissions('ict:write')
  createMaintenance(@Body() dto: any) {
    return this.service.recordIctAction('maintenance.created', dto);
  }

  @Post('maintenance/:id/complete')
  @Permissions('ict:write')
  completeMaintenance(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordIctAction('maintenance.completed', dto, id);
  }

  @Get('facilities-issues')
  getFacilitiesIssues() {
    return this.service.getFacilitiesIssues();
  }

  @Post('facilities-issues')
  @Permissions('ict:write')
  createFacilitiesIssue(@Body() dto: any) {
    return this.service.recordIctAction('facilities-issue.created', dto);
  }

  @Post('facilities-issues/:id/resolve')
  @Permissions('ict:write')
  resolveFacilitiesIssue(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordIctAction('facilities-issue.resolved', dto, id);
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

  @Post('actions')
  @Permissions('ict:write')
  recordAction(@Body() dto: any) {
    return this.service.recordIctAction(String(dto?.action || 'workflow.action'), dto, dto?.entityId ?? dto?.entity_id ?? null);
  }
}
