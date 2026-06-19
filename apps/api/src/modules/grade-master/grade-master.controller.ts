import { Controller, Get, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Controller('grade-master')
@UseGuards(JwtAuthGuard, RbacGuard)
@RequiresModule('academics')
export class GradeMasterController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('overview')
  @Permissions('academics:read')
  async getOverview() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      return { totalReportCards: 0, averageScore: 0, passedCount: 0 };
    }

    try {
      const reportCards = await this.prisma.reportCard.findMany({
        where: { schoolId: tenantId }
      });

      const total = reportCards.length;
      let sum = 0;
      let passed = 0;

      for (const rc of reportCards) {
        const avgScore = (rc as any).averageMark || (rc as any).meanScore || (rc as any).gpa || 0;
        sum += Number(avgScore);
        if (avgScore >= 50) passed++;
      }

      const averageScore = total > 0 ? sum / total : 0;

      return {
        totalReportCards: total,
        averageScore: Math.round(averageScore * 100) / 100,
        passedCount: passed,
        failedCount: total - passed
      };
    } catch (e: any) {
      console.error('getOverview error:', e);
      throw new InternalServerErrorException(e.message || 'Database error occurred');
    }
  }
}

