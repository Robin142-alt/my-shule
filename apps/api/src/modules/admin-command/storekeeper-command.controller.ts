import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { StorekeeperCommandService } from './storekeeper-command.service';

@Controller('admin-command/storekeeper')
@RequiresModule('inventory')
@Permissions('storekeeper:read')
export class StorekeeperCommandController {
  constructor(private readonly service: StorekeeperCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('items')
  getItems() {
    return this.service.getItems();
  }

  @Post('items')
  @Permissions('storekeeper:write')
  createItem(@Body() dto: any) {
    return this.service.createItem(dto);
  }

  @Patch('items/:id')
  @Permissions('storekeeper:write')
  updateItem(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateItem(id, dto);
  }

  @Delete('items/:id')
  @Permissions('storekeeper:write')
  archiveItem(@Param('id') id: string) {
    return this.service.archiveItem(id);
  }

  @Post('items/issue')
  @Permissions('storekeeper:write')
  issueItem(@Body() dto: any) {
    return this.service.issueItem(dto);
  }

  @Post('items/receive')
  @Permissions('storekeeper:write')
  receiveItem(@Body() dto: any) {
    return this.service.receiveItem(dto);
  }

  @Get('low-stock')
  getLowStock() {
    return this.service.getLowStock();
  }

  @Post('low-stock/:id/reorder')
  @Permissions('storekeeper:write')
  reorderItem(@Param('id') id: string) {
    return this.service.reorderItem(id);
  }

  @Get('requests')
  getRequests() {
    return this.service.getRequests();
  }

  @Post('requests/:id/approve')
  @Permissions('storekeeper:write')
  approveRequest(@Param('id') id: string) {
    return this.service.actionRequest(id, 'approved');
  }

  @Post('requests/:id/reject')
  @Permissions('storekeeper:write')
  rejectRequest(@Param('id') id: string, @Body() dto: any) {
    return this.service.actionRequest(id, 'rejected', dto);
  }

  @Post('requests/:id/fulfill')
  @Permissions('storekeeper:write')
  fulfillRequest(@Param('id') id: string) {
    return this.service.fulfillRequest(id);
  }

  @Get('stocktake')
  getStocktake() {
    return this.service.getStocktake();
  }

  @Post('stocktake')
  @Permissions('storekeeper:write')
  startStocktake(@Body() dto: any) {
    return this.service.startStocktake(dto);
  }

  @Post('stocktake/:id/submit')
  @Permissions('storekeeper:write')
  submitStocktake(@Param('id') id: string, @Body() dto: any) {
    return this.service.submitStocktake(id, dto);
  }

  @Post('stocktake/:id/finalize')
  @Permissions('storekeeper:write')
  finalizeStocktake(@Param('id') id: string) {
    return this.service.finalizeStocktake(id);
  }

  @Get('damaged-missing')
  getDamagedMissing() {
    return this.service.getDamagedMissing();
  }

  @Post('damaged-missing')
  @Permissions('storekeeper:write')
  reportDamagedMissing(@Body() dto: any) {
    return this.service.reportDamagedMissing(dto);
  }

  @Post('damaged-missing/:id/write-off')
  @Permissions('storekeeper:write')
  writeOffDamagedMissing(@Param('id') id: string, @Body() dto: any) {
    return this.service.writeOffDamagedMissing(id, dto);
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('storekeeper:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Post('actions')
  @Permissions('storekeeper:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }

  @Get('reports/:id/download')
  downloadReport(@Param('id') id: string) {
    return this.service.downloadReport(id);
  }
}
