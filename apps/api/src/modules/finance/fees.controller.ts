import { Controller, Get, UnauthorizedException } from '@nestjs/common';
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
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const items = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
      tx.feeStructure.findMany({
        where: { schoolId: tenantId }
      }),
    );
    return { items };
  }

  @Get('payments')
  @Permissions('finance:read')
  async getFeePayments() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const items = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
      tx.payment.findMany({
        where: { schoolId: tenantId },
        orderBy: { paymentDate: 'desc' },
        take: 50
      }),
    );
    return { items };
  }
}
