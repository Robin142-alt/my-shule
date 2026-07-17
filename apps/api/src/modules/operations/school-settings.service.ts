import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';

type SchoolIdentityRow = {
  name: string;
  subdomain: string;
  settings: Record<string, unknown> | string | null;
};

@Injectable()
export class SchoolSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly fileStorage: DatabaseFileStorageService,
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

  async getIdentity() {
    const tenantId = this.tenantId;
    const identity = await this.getIdentityRow(tenantId);
    const settings = this.parseSettings(identity.settings);
    const storagePath = String(settings.logo_storage_path ?? '').trim();
    const savedLogoUrl = String(settings.logo_url ?? '').trim();

    return {
      tenantId,
      subdomain: identity.subdomain,
      schoolName: identity.name,
      logoUrl: storagePath ? '/api/school/identity/logo' : savedLogoUrl || null,
    };
  }

  async getIdentityLogo() {
    const tenantId = this.tenantId;
    const identity = await this.getIdentityRow(tenantId);
    const settings = this.parseSettings(identity.settings);
    const storagePath = String(settings.logo_storage_path ?? '').trim();

    if (!storagePath) {
      throw new NotFoundException('This school has not uploaded a logo');
    }

    try {
      return await this.fileStorage.readForTenant({ tenantId, storagePath });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException('The uploaded school logo could not be found');
      }
      throw error;
    }
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

  private async getIdentityRow(tenantId: string): Promise<SchoolIdentityRow> {
    const rows = await this.prisma.$queryRawUnsafe<SchoolIdentityRow[]>(
      `SELECT name, subdomain, settings FROM tenants WHERE tenant_id = $1 LIMIT 1`,
      tenantId,
    );
    const identity = rows[0];

    if (!identity) {
      throw new NotFoundException('School identity was not found');
    }

    return identity;
  }

  private parseSettings(value: SchoolIdentityRow['settings']): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'object') return value;

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
}
