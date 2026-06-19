import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  AttachSupplierInvoiceDto,
  CreateProcurementRequestDto,
  CreateProcurementSupplierDto,
  CreatePurchaseOrderDto,
  RecordProcurementApprovalDto,
} from './dto/procurement.dto';
import { ProcurementService } from './procurement.service';

@Controller('procurement')
@RequiresModule('procurement')
export class ProcurementController {
  constructor(
    private readonly procurementService: ProcurementService,
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService
  ) {}

  @Get('dashboard')
  @Permissions('procurement:read')
  getDashboard() {
    return this.procurementService.getDashboard();
  }

  @Post('suppliers')
  @Permissions('procurement:write')
  createSupplier(@Body() dto: CreateProcurementSupplierDto) {
    return this.procurementService.createSupplier(dto);
  }

  @Post('requests')
  @Permissions('procurement:write')
  createRequest(@Body() dto: CreateProcurementRequestDto) {
    return this.procurementService.createRequest(dto);
  }

  @Patch('requests/:requestId/approval')
  @Permissions('procurement:approve')
  recordApproval(
    @Param('requestId') requestId: string,
    @Body() dto: RecordProcurementApprovalDto,
  ) {
    return this.procurementService.recordApproval(requestId, dto);
  }

  @Post('purchase-orders')
  @Permissions('procurement:write')
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto) {
    return this.procurementService.createPurchaseOrder(dto);
  }

  @Post('purchase-orders/:purchaseOrderId/invoices')
  @Permissions('procurement:write')
  attachInvoice(
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Body() dto: AttachSupplierInvoiceDto,
  ) {
    return this.procurementService.attachInvoice(purchaseOrderId, dto);
  }

  @Get('purchase-orders')
  @Permissions('procurement:read')
  async getPurchaseOrders() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new Error('Tenant ID required');
    const items = await this.prisma.purchaseOrder.findMany({
      where: { schoolId: tenantId as string },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return { items };
  }
}
