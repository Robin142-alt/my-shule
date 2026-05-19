import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ModuleCode } from './module-access.constants';
import { ModuleAccessRepository } from './module-access.repository';
import {
  CloneModulePackageDto,
  CreateModulePackageDto,
  SetSchoolModulesDto,
  ToggleSchoolModuleDto,
  UpsertModuleRegistryDto,
} from './dto/module-access.dto';

@Injectable()
export class ModuleAccessService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: ModuleAccessRepository,
  ) {}

  listRegistry() {
    return this.repository.listRegistry();
  }

  upsertRegistry(dto: UpsertModuleRegistryDto) {
    return this.repository.upsertRegistry({
      code: this.normalizeModuleCode(dto.code),
      name: this.requireText(dto.name, 'Module name'),
      description: this.requireText(dto.description, 'Module description'),
      feature_flags: dto.feature_flags ?? {},
      status: dto.status ?? 'active',
      base_price_cents: dto.base_price_cents ?? 0,
      per_student_price_cents: dto.per_student_price_cents ?? 0,
      billing_metadata: dto.billing_metadata ?? {},
      category: dto.category?.trim() || 'custom',
      route_segment: dto.route_segment?.trim() || null,
      permission_scopes: dto.permission_scopes ?? [],
    });
  }

  listModulePackages() {
    return this.repository.listModulePackages();
  }

  createModulePackage(dto: CreateModulePackageDto) {
    return this.repository.createModulePackage({
      code: this.normalizeModuleCode(dto.code),
      name: this.requireText(dto.name, 'Package name'),
      description: dto.description?.trim() || null,
      pricing_model: dto.pricing_model ?? 'custom',
      billing_metadata: dto.billing_metadata ?? {},
      module_codes: this.normalizeModuleCodes(dto.module_codes),
    });
  }

  cloneModulePackage(packageId: string, dto: CloneModulePackageDto) {
    return this.repository.cloneModulePackage({
      source_package_id: packageId,
      code: this.normalizeModuleCode(dto.code),
      name: this.requireText(dto.name, 'Package name'),
      actor_user_id: this.currentUserId() ?? '00000000-0000-0000-0000-000000000000',
    });
  }

  listSchoolModules(tenantId: string) {
    return this.repository.listSchoolModules(this.normalizeTenantId(tenantId));
  }

  listCurrentTenantModules() {
    return this.repository.listEnabledModuleCodes(this.requireTenantId());
  }

  listEnabledModulesForTenant(tenantId: string) {
    return this.repository.listEnabledModuleCodes(this.normalizeTenantId(tenantId));
  }

  async setSchoolModules(tenantId: string, dto: SetSchoolModulesDto) {
    const moduleCodes = this.normalizeModuleCodes(dto.module_codes);

    return this.repository.setSchoolModules({
      tenantId: this.normalizeTenantId(tenantId),
      moduleCodes,
      updatedBy: this.currentUserId(),
    });
  }

  async setSchoolModuleCodes(input: {
    tenantId: string;
    moduleCodes: string[];
    updatedBy: string | null;
  }) {
    return this.repository.setSchoolModules({
      tenantId: this.normalizeTenantId(input.tenantId),
      moduleCodes: this.normalizeModuleCodes(input.moduleCodes),
      updatedBy: input.updatedBy,
    });
  }

  toggleSchoolModule(tenantId: string, moduleCode: string, dto: ToggleSchoolModuleDto) {
    return this.repository.toggleSchoolModule({
      tenantId: this.normalizeTenantId(tenantId),
      moduleCode: this.normalizeModuleCode(moduleCode),
      enabled: dto.enabled,
      updatedBy: this.currentUserId(),
      accessLevel: dto.access_level ?? 'standard',
      trialEndsAt: this.normalizeOptionalDate(dto.trial_ends_at, 'Trial end date'),
      expiresAt: this.normalizeOptionalDate(dto.expires_at, 'Module expiry date'),
      billingPlanCode: dto.billing_plan_code?.trim() || null,
      featureFlags: dto.feature_flags ?? {},
      activationReason: dto.activation_reason?.trim() || null,
    });
  }

  findFirstMissingModule(tenantId: string, moduleCodes: ModuleCode[]) {
    return this.repository.findFirstMissingModule(tenantId, moduleCodes);
  }

  private normalizeModuleCodes(moduleCodes: string[]): string[] {
    const normalized = Array.from(new Set(moduleCodes.map((code) => this.normalizeModuleCode(code))));

    if (normalized.length === 0) {
      throw new BadRequestException('Select at least one module for this school.');
    }

    return normalized;
  }

  private normalizeModuleCode(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');

    if (!/^[a-z][a-z0-9_]{1,79}$/.test(normalized)) {
      throw new BadRequestException('Use a valid module code.');
    }

    return normalized;
  }

  private normalizeTenantId(value: string): string {
    const normalized = value.trim().toLowerCase();

    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(normalized)) {
      throw new BadRequestException('Use a valid school tenant id.');
    }

    return normalized;
  }

  private normalizeOptionalDate(value: string | null | undefined, fieldName: string): string | null {
    if (!value) {
      return null;
    }

    const timestamp = Date.parse(value);

    if (Number.isNaN(timestamp)) {
      throw new BadRequestException(`${fieldName} must be a valid date.`);
    }

    return new Date(timestamp).toISOString();
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for module access.');
    }

    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return normalized;
  }
}
