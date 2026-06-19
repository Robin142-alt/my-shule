import { Controller, Get, Post, Body } from '@nestjs/common';
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

  @Get('requests')
  getRequests() {
    return this.service.getRequests();
  }

  @Get('stocktake')
  getStocktake() {
    return this.service.getStocktake();
  }

  @Get('damaged-missing')
  getDamagedMissing() {
    return this.service.getDamagedMissing();
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
}
