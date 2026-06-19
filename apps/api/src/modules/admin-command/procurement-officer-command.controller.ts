import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ProcurementOfficerCommandService } from './procurement-officer-command.service';

@Controller('admin-command/procurement-officer')
@RequiresModule('inventory')
@Permissions('procurement:read')
export class ProcurementOfficerCommandController {
  constructor(private readonly service: ProcurementOfficerCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('suppliers')
  getSuppliers() {
    return this.service.getSuppliers();
  }

  @Get('purchase-requests')
  getPurchaseRequests() {
    return this.service.getPurchaseRequests();
  }

  @Get('quotations')
  getQuotations() {
    return this.service.getQuotations();
  }

  @Get('purchase-orders')
  getPurchaseOrders() {
    return this.service.getPurchaseOrders();
  }

  @Get('deliveries')
  getDeliveries() {
    return this.service.getDeliveries();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('procurement:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
