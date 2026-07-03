import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
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

  async updateProfile(body: { address?: string; phone?: string; email?: string; motto?: string }) {
    const tenantId = this.tenantId;
    const data = {
      ...(typeof body.address === 'string' ? { address: body.address.trim() } : {}),
      ...(typeof body.phone === 'string' ? { phone: body.phone.trim() } : {}),
      ...(typeof body.email === 'string' ? { email: body.email.trim() } : {}),
      ...(typeof body.motto === 'string' ? { motto: body.motto.trim() } : {}),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one school profile field is required');
    }

    return this.prisma.school.update({
      where: { id: tenantId },
      data,
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        address: true,
        phone: true,
        email: true,
        motto: true,
        updatedAt: true,
      },
    });
  }
}
