import { Body, Controller, Post, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Controller('parent-portal')
@UseGuards(JwtAuthGuard, RbacGuard)
@RequiresModule('parent_portal')
export class ParentPortalActionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Post('fees/pay')
  @Permissions('portal:read_own_children')
  async payFees(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const { studentId, amount, paymentReference, reference, paymentMethod } = body;

    try {
      const payment = await this.prisma.payment.create({
        data: {
          schoolId: tenantId || "",
          studentId,
          amount: Number(amount),
          paymentReference: paymentReference || reference || `PAY-${Date.now()}`,
          paymentMethod: paymentMethod || 'MPESA',
          paymentDate: new Date(),
          status: 'CONFIRMED',
        }
      });
      return { success: true, paymentId: payment.id };
    } catch (error: any) {
      console.error('payFees error:', error);
      throw new InternalServerErrorException(error.message || 'Database error occurred');
    }
  }
}
