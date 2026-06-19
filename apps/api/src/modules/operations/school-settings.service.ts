import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Injectable()
export class SchoolSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) throw new InternalServerErrorException('Tenant ID is required');
    return tenantId;
  }

  async getSmsWallet() {
    const tenantId = this.tenantId;
    const wallet = await this.prisma.schoolSmsWallets.findFirst({
      where: { tenant_id: tenantId },
    });

    return wallet || { balance: 0, status: 'inactive' };
  }

  async getMyModules() {
    const tenantId = this.tenantId;
    const modules = await this.prisma.schoolModuleAccess.findMany({
      where: { tenant_id: tenantId, enabled: 'true' },
    });

    return modules;
  }

  async getSettings() {
    const tenantId = this.tenantId;
    const settings = await this.prisma.schoolSetting.findMany({
      where: { schoolId: tenantId }
    });

    return settings;
  }
}
