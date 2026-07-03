import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
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

  @Post('suppliers')
  @Permissions('procurement:write')
  createSupplier(@Body() dto: any) {
    return this.service.createSupplier(dto);
  }

  @Put('suppliers/:id')
  @Permissions('procurement:write')
  updateSupplier(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateSupplier(id, dto);
  }

  @Get('purchase-requests')
  getPurchaseRequests() {
    return this.service.getPurchaseRequests();
  }

  @Post('purchase-requests')
  @Permissions('procurement:write')
  createPurchaseRequest(@Body() dto: any) {
    return this.service.createPurchaseRequest(dto);
  }

  @Post('purchase-requests/:id/approve')
  @Permissions('procurement:write')
  approvePurchaseRequest(@Param('id') id: string) {
    return this.service.decidePurchaseRequest(id, 'approved');
  }

  @Post('purchase-requests/:id/reject')
  @Permissions('procurement:write')
  rejectPurchaseRequest(@Param('id') id: string, @Body() dto: any) {
    return this.service.decidePurchaseRequest(id, 'rejected', dto);
  }

  @Get('quotations')
  getQuotations() {
    return this.service.getQuotations();
  }

  @Post('quotations')
  @Permissions('procurement:write')
  createQuotation(@Body() dto: any) {
    return this.service.createQuotation(dto);
  }

  @Post('quotations/:id/select')
  @Permissions('procurement:write')
  selectQuotation(@Param('id') id: string) {
    return this.service.selectQuotation(id);
  }

  @Get('purchase-orders')
  getPurchaseOrders() {
    return this.service.getPurchaseOrders();
  }

  @Post('purchase-orders')
  @Permissions('procurement:write')
  createPurchaseOrder(@Body() dto: any) {
    return this.service.createPurchaseOrder(dto);
  }

  @Post('purchase-orders/:id/approve')
  @Permissions('procurement:write')
  approvePurchaseOrder(@Param('id') id: string) {
    return this.service.approvePurchaseOrder(id);
  }

  @Get('deliveries')
  getDeliveries() {
    return this.service.getDeliveries();
  }

  @Post('deliveries')
  @Permissions('procurement:write')
  recordDelivery(@Body() dto: any) {
    return this.service.recordDelivery(dto);
  }

  @Post('deliveries/:id/confirm')
  @Permissions('procurement:write')
  confirmDelivery(@Param('id') id: string) {
    return this.service.confirmDelivery(id);
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

  @Post('budget-actions')
  @Permissions('procurement:write')
  runBudgetAction(@Body() dto: any) {
    return this.service.runBudgetAction(dto);
  }

  @Post('actions')
  @Permissions('procurement:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }
}
