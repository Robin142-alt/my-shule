import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';

@Controller('fees')
@RequiresModule('finance')
export class FeesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService
  ) {}

  @Get('summary')
  @Permissions('finance:read')
  async getFeeSummary() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new Error('Tenant ID required');
    const items = await this.prisma.feeStructure.findMany({
      where: { schoolId: tenantId as string }
    });
    return { items };
  }

  @Get('payments')
  @Permissions('finance:read')
  async getFeePayments() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new Error('Tenant ID required');
    const items = await this.prisma.payment.findMany({
      where: { schoolId: tenantId as string },
      orderBy: { paymentDate: 'desc' },
      take: 50
    });
    return { items };
  }
}

