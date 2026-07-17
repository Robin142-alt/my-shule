import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import {
  MODULE_REGISTRY_SEED,
  ModuleCode,
  ModuleRegistrySeedItem,
} from './module-access.constants';
import {
  ModuleRegistryResponseDto,
  SchoolModuleAccessResponseDto,
} from './dto/module-access.dto';

type ModuleRegistryRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  feature_flags: Record<string, unknown> | string;
  status: 'active' | 'inactive';
  base_price_cents: number | string;
  per_student_price_cents: number | string;
  billing_metadata: Record<string, unknown> | string;
  category?: string | null;
  route_segment?: string | null;
  permission_scopes?: string[] | string | null;
  enabled?: boolean | null;
  enabled_at?: Date | string | null;
  disabled_at?: Date | string | null;
  updated_by?: string | null;
  access_level?: string | null;
  trial_ends_at?: Date | string | null;
  expires_at?: Date | string | null;
  billing_plan_code?: string | null;
  assignment_feature_flags?: Record<string, unknown> | string | null;
};

@Injectable()
export class ModuleAccessRepository {
  private readonly enabledModulesCache = new Map<string, { expiresAt: number; codes: string[] }>();
  private readonly enabledModulesLoads = new Map<string, Promise<string[]>>();
  private readonly enabledModulesCacheTtlMs = 15_000;

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await (this.prisma as any).$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  async seedRegistry(): Promise<void> {
    for (const moduleDefinition of MODULE_REGISTRY_SEED as readonly ModuleRegistrySeedItem[]) {
      await this.executeSql(
        `
          INSERT INTO module_registry (
            code, name, description, feature_flags, status,
            base_price_cents, per_student_price_cents, billing_metadata,
            category, route_segment, permission_scopes
          )
          SELECT $1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb
          WHERE NOT EXISTS (
            SELECT 1 FROM module_registry WHERE code = $1
          )
        `,
        [
          moduleDefinition.code,
          moduleDefinition.name,
          moduleDefinition.description,
          JSON.stringify(moduleDefinition.feature_flags ?? {}),
          moduleDefinition.status ?? 'active',
          moduleDefinition.base_price_cents ?? 0,
          moduleDefinition.per_student_price_cents ?? 0,
          JSON.stringify(moduleDefinition.billing_metadata ?? {}),
          moduleDefinition.category ?? 'operations',
          moduleDefinition.route_segment ?? null,
          JSON.stringify(moduleDefinition.permission_scopes ?? []),
        ],
      );
    }
  }

  async listRegistry(): Promise<ModuleRegistryResponseDto[]> {
    const result = await this.executeSql<ModuleRegistryRow>(
      `
        SELECT id::text, code, name, description, feature_flags, status,
               base_price_cents, per_student_price_cents, billing_metadata,
               category, route_segment, permission_scopes
        FROM module_registry
        ORDER BY name ASC
      `,
    );

    return result.rows.map((row) => this.mapRegistryRow(row));
  }

  async upsertRegistry(input: {
    code: string;
    name: string;
    description: string;
    feature_flags: Record<string, unknown>;
    status: 'active' | 'inactive';
    base_price_cents: number;
    per_student_price_cents: number;
    billing_metadata: Record<string, unknown>;
    category: string;
    route_segment: string | null;
    permission_scopes: string[];
  }): Promise<ModuleRegistryResponseDto> {
    // Try to update first
    const updateResult = await this.executeSql<ModuleRegistryRow>(
      `
        UPDATE module_registry SET
          name = $2,
          description = $3,
          feature_flags = $4::jsonb,
          status = $5,
          base_price_cents = $6,
          per_student_price_cents = $7,
          billing_metadata = $8::jsonb,
          category = $9,
          route_segment = $10,
          permission_scopes = $11::jsonb,
          updated_at = NOW()
        WHERE code = $1
        RETURNING id::text, code, name, description, feature_flags, status,
                  base_price_cents, per_student_price_cents, billing_metadata,
                  category, route_segment, permission_scopes
      `,
      [
        input.code,
        input.name,
        input.description,
        JSON.stringify(input.feature_flags),
        input.status,
        input.base_price_cents,
        input.per_student_price_cents,
        JSON.stringify(input.billing_metadata),
        input.category,
        input.route_segment,
        JSON.stringify(input.permission_scopes),
      ],
    );

    if (updateResult.rows.length > 0) {
      return this.mapRegistryRow(updateResult.rows[0]);
    }

    // If no row was updated, insert it
    const insertResult = await this.executeSql<ModuleRegistryRow>(
      `
        INSERT INTO module_registry (
          code, name, description, feature_flags, status,
          base_price_cents, per_student_price_cents, billing_metadata,
          category, route_segment, permission_scopes
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb)
        RETURNING id::text, code, name, description, feature_flags, status,
                  base_price_cents, per_student_price_cents, billing_metadata,
                  category, route_segment, permission_scopes
      `,
      [
        input.code,
        input.name,
        input.description,
        JSON.stringify(input.feature_flags),
        input.status,
        input.base_price_cents,
        input.per_student_price_cents,
        JSON.stringify(input.billing_metadata),
        input.category,
        input.route_segment,
        JSON.stringify(input.permission_scopes),
      ],
    );

    return this.mapRegistryRow(insertResult.rows[0]);
  }

  async listSchoolModules(tenantId: string): Promise<SchoolModuleAccessResponseDto[]> {
    return this.withTenantScope(tenantId, async () => {
      const result = await this.executeSql<ModuleRegistryRow>(
        `
          SELECT
            mr.id::text,
            mr.code,
            mr.name,
            mr.description,
            mr.feature_flags,
            mr.status,
            mr.base_price_cents,
            mr.per_student_price_cents,
            mr.billing_metadata,
            mr.category,
            mr.route_segment,
            mr.permission_scopes,
            COALESCE(sma.enabled, false) AS enabled,
            sma.enabled_at,
            sma.disabled_at,
            sma.updated_by::text,
            sma.access_level,
            sma.trial_ends_at,
            sma.expires_at,
            sma.billing_plan_code,
            sma.feature_flags AS assignment_feature_flags
          FROM module_registry mr
          LEFT JOIN school_module_access sma
            ON sma.module_id = mr.id
           AND sma.tenant_id = $1
          ORDER BY mr.name ASC
        `,
        [tenantId],
      );

      return result.rows.map((row) => this.mapSchoolModuleRow(row));
    });
  }

  async listEnabledModuleCodes(tenantId: string): Promise<string[]> {
    const cached = this.enabledModulesCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return [...cached.codes];
    }

    const existingLoad = this.enabledModulesLoads.get(tenantId);
    if (existingLoad) {
      return [...(await existingLoad)];
    }

    const load = this.loadEnabledModuleCodes(tenantId);
    this.enabledModulesLoads.set(tenantId, load);

    try {
      const codes = await load;
      this.enabledModulesCache.set(tenantId, {
        expiresAt: Date.now() + this.enabledModulesCacheTtlMs,
        codes,
      });
      return [...codes];
    } finally {
      this.enabledModulesLoads.delete(tenantId);
    }
  }

  private async loadEnabledModuleCodes(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const result = await tx.$queryRawUnsafe<Array<{ code: string }>>(
        `
          SELECT mr.code
          FROM school_module_access sma
          INNER JOIN module_registry mr ON mr.id = sma.module_id
          WHERE sma.tenant_id = $1
            AND sma.enabled = true
            AND mr.status = 'active'
            AND (sma.expires_at IS NULL OR sma.expires_at > NOW())
            AND (sma.trial_ends_at IS NULL OR sma.trial_ends_at > NOW() OR sma.access_level <> 'trial')
          ORDER BY mr.code ASC
        `,
        tenantId,
      );

      return (Array.isArray(result) ? result : []).map((row) => row.code);
    });

    return rows;
  }

  private invalidateEnabledModules(tenantId: string): void {
    this.enabledModulesCache.delete(tenantId);
  }

  async findFirstMissingModule(
    tenantId: string,
    moduleCodes: ModuleCode[],
  ): Promise<ModuleCode | undefined> {
    const enabledCodes = await this.listEnabledModuleCodes(tenantId);
    const enabled = new Set(enabledCodes);

    return moduleCodes.find((code) => !enabled.has(code));
  }

  async setSchoolModules(input: {
    tenantId: string;
    moduleCodes: string[];
    updatedBy: string | null;
  }): Promise<SchoolModuleAccessResponseDto[]> {
    return this.withTenantScope(input.tenantId, async () => {
      await this.seedRegistry();
      await this.assertKnownActiveModules(input.moduleCodes);

      await this.executeSql(
        `
          UPDATE school_module_access sma
          SET enabled = false,
              disabled_at = NOW(),
              updated_by = $2::uuid,
              updated_at = NOW()
          FROM module_registry mr
          WHERE sma.module_id = mr.id
            AND sma.tenant_id = $1
            AND sma.enabled = true
            AND NOT (mr.code = ANY($3::text[]))
        `,
        [input.tenantId, input.updatedBy, input.moduleCodes],
      );

      // First, update existing ones that should be enabled
      await this.executeSql(
        `
          UPDATE school_module_access sma
          SET enabled = true,
              enabled_at = COALESCE(sma.enabled_at, NOW()),
              disabled_at = NULL,
              access_level = 'standard',
              trial_ends_at = NULL,
              expires_at = NULL,
              billing_plan_code = NULL,
              feature_flags = '{}'::jsonb,
              activation_reason = 'superadmin_bulk_allocation',
              updated_by = $3::uuid,
              updated_at = NOW()
          FROM module_registry mr
          WHERE sma.module_id = mr.id
            AND sma.tenant_id = $1
            AND (mr.code = ANY($2::text[]))
        `,
        [input.tenantId, input.moduleCodes, input.updatedBy],
      );

      // Then insert the missing ones
      await this.executeSql(
        `
          INSERT INTO school_module_access (
            tenant_id,
            module_id,
            enabled,
            enabled_at,
            disabled_at,
            updated_by,
            access_level,
            trial_ends_at,
            expires_at,
            billing_plan_code,
            feature_flags,
            activation_reason
          )
          SELECT
            $1,
            id,
            true,
            NOW(),
            NULL,
            $3::uuid,
            'standard',
            NULL::timestamptz,
            NULL::timestamptz,
            NULL::text,
            '{}'::jsonb,
            'superadmin_bulk_allocation'
          FROM module_registry mr
          WHERE code = ANY($2::text[])
            AND status = 'active'
            AND NOT EXISTS (
              SELECT 1 FROM school_module_access sma
              WHERE sma.module_id = mr.id AND sma.tenant_id = $1
            )
          ON CONFLICT (tenant_id, module_id)
          DO UPDATE SET
            enabled = EXCLUDED.enabled,
            enabled_at = COALESCE(school_module_access.enabled_at, NOW()),
            disabled_at = NULL,
            updated_by = EXCLUDED.updated_by,
            access_level = EXCLUDED.access_level,
            trial_ends_at = EXCLUDED.trial_ends_at,
            expires_at = EXCLUDED.expires_at,
            billing_plan_code = EXCLUDED.billing_plan_code,
            feature_flags = EXCLUDED.feature_flags,
            activation_reason = EXCLUDED.activation_reason,
            updated_at = NOW()
        `,
        [input.tenantId, input.moduleCodes, input.updatedBy],
      );

      await this.appendAuditLog({
        tenantId: input.tenantId,
        actorUserId: input.updatedBy,
        action: 'module_access.school_modules_replaced',
        metadata: { module_codes: input.moduleCodes },
      });

      this.invalidateEnabledModules(input.tenantId);

      return this.listSchoolModules(input.tenantId);
    });
  }

  async toggleSchoolModule(input: {
    tenantId: string;
    moduleCode: string;
    enabled: boolean;
    updatedBy: string | null;
    accessLevel?: 'standard' | 'trial' | 'premium' | 'enterprise';
    trialEndsAt?: string | null;
    expiresAt?: string | null;
    billingPlanCode?: string | null;
    featureFlags?: Record<string, unknown>;
    activationReason?: string | null;
  }): Promise<SchoolModuleAccessResponseDto[]> {
    return this.withTenantScope(input.tenantId, async () => {
      await this.assertKnownActiveModules([input.moduleCode]);

      await this.executeSql(
        `
          INSERT INTO school_module_access (
            tenant_id,
            module_id,
            enabled,
            enabled_at,
            disabled_at,
            updated_by,
            access_level,
            trial_ends_at,
            expires_at,
            billing_plan_code,
            feature_flags,
            activation_reason
          )
          SELECT
            $1,
            id,
            $3,
            CASE WHEN $3 THEN NOW() ELSE NULL END,
            CASE WHEN $3 THEN NULL ELSE NOW() END,
            $4::uuid,
            $5,
            $6::timestamptz,
            $7::timestamptz,
            $8,
            $9::jsonb,
            $10
          FROM module_registry
          WHERE code = $2
            AND status = 'active'
          ON CONFLICT (tenant_id, module_id)
          DO UPDATE SET
            enabled = EXCLUDED.enabled,
            enabled_at = CASE WHEN EXCLUDED.enabled THEN COALESCE(school_module_access.enabled_at, NOW()) ELSE NULL END,
            disabled_at = CASE WHEN EXCLUDED.enabled THEN NULL ELSE NOW() END,
            updated_by = EXCLUDED.updated_by,
            access_level = EXCLUDED.access_level,
            trial_ends_at = EXCLUDED.trial_ends_at,
            expires_at = EXCLUDED.expires_at,
            billing_plan_code = EXCLUDED.billing_plan_code,
            feature_flags = EXCLUDED.feature_flags,
            activation_reason = EXCLUDED.activation_reason,
            updated_at = NOW()
        `,
        [
          input.tenantId,
          input.moduleCode,
          input.enabled,
          input.updatedBy,
          input.accessLevel ?? 'standard',
          input.trialEndsAt ?? null,
          input.expiresAt ?? null,
          input.billingPlanCode ?? null,
          JSON.stringify(input.featureFlags ?? {}),
          input.activationReason ?? null,
        ],
      );

      await this.appendAuditLog({
        tenantId: input.tenantId,
        actorUserId: input.updatedBy,
        action: input.enabled
          ? 'module_access.school_module_enabled'
          : 'module_access.school_module_disabled',
        metadata: { module_code: input.moduleCode, enabled: input.enabled },
      });

      this.invalidateEnabledModules(input.tenantId);

      return this.listSchoolModules(input.tenantId);
    });
  }

  async listModulePackages(): Promise<Record<string, unknown>[]> {
    const result = await this.executeSql<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      pricing_model: string;
      billing_metadata: Record<string, unknown> | string;
      module_codes: string[] | string | null;
    }>(
      `
        SELECT
          mp.id::text,
          mp.code,
          mp.name,
          mp.description,
          mp.pricing_model,
          mp.billing_metadata,
          COALESCE(
            jsonb_agg(mpi.module_code ORDER BY mpi.module_code)
              FILTER (WHERE mpi.module_code IS NOT NULL),
            '[]'::jsonb
          ) AS module_codes
        FROM module_packages mp
        LEFT JOIN module_package_items mpi ON mpi.package_id = mp.id
        WHERE mp.is_active = TRUE
        GROUP BY mp.id
        ORDER BY mp.name ASC
      `,
    );

    return result.rows.map((row) => ({
      ...row,
      billing_metadata: this.toObject(row.billing_metadata),
      module_codes: this.toStringArray(row.module_codes),
    }));
  }

  async createModulePackage(input: {
    code: string;
    name: string;
    description?: string | null;
    pricing_model: 'per_student' | 'per_module' | 'tiered' | 'enterprise' | 'custom';
    billing_metadata: Record<string, unknown>;
    module_codes: string[];
  }): Promise<Record<string, unknown>> {
    await this.assertKnownActiveModules(input.module_codes);

    return this.prisma.withRequestTransaction(async () => {
      const packageResult = await this.executeSql(
        `
          INSERT INTO module_packages (code, name, description, pricing_model, billing_metadata)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          ON CONFLICT (code)
          DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            pricing_model = EXCLUDED.pricing_model,
            billing_metadata = EXCLUDED.billing_metadata,
            updated_at = NOW()
          RETURNING id::text, code, name, description, pricing_model, billing_metadata
        `,
        [
          input.code,
          input.name,
          input.description ?? null,
          input.pricing_model,
          JSON.stringify(input.billing_metadata ?? {}),
        ],
      );
      const packageRow = packageResult.rows[0] as Record<string, unknown>;

      await this.executeSql(
        'DELETE FROM module_package_items WHERE package_id = $1::uuid',
        [packageRow.id],
      );

      for (const moduleCode of input.module_codes) {
        await this.executeSql(
          `
            INSERT INTO module_package_items (package_id, module_code)
            VALUES ($1::uuid, $2)
          `,
          [packageRow.id, moduleCode],
        );
      }

      return {
        ...packageRow,
        module_codes: input.module_codes,
      };
    });
  }

  async cloneModulePackage(input: {
    source_package_id: string;
    code: string;
    name: string;
    actor_user_id: string;
  }): Promise<Record<string, unknown>> {
    return this.prisma.withRequestTransaction(async () => {
      const source = await this.executeSql<{
        pricing_model: string;
        billing_metadata: Record<string, unknown> | string;
      }>(
        `
          SELECT pricing_model, billing_metadata
          FROM module_packages
          WHERE id = $1::uuid
            AND is_active = TRUE
          LIMIT 1
        `,
        [input.source_package_id],
      );
      const sourceRow = source.rows[0];

      if (!sourceRow) {
        throw new Error('Source module package was not found');
      }

      const modules = await this.executeSql<{ module_code: string }>(
        `
          SELECT module_code
          FROM module_package_items
          WHERE package_id = $1::uuid
          ORDER BY module_code ASC
        `,
        [input.source_package_id],
      );

      return this.createModulePackage({
        code: input.code,
        name: input.name,
        description: `Cloned from ${input.source_package_id}`,
        pricing_model: sourceRow.pricing_model as 'per_student' | 'per_module' | 'tiered' | 'enterprise' | 'custom',
        billing_metadata: this.toObject(sourceRow.billing_metadata),
        module_codes: modules.rows.map((row) => row.module_code),
      });
    });
  }

  async recordModuleUsage(input: {
    tenant_id: string;
    module_code: string;
    event_name: string;
    actor_user_id?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.withTenantScope(input.tenant_id, async () => {
      await this.executeSql(
        `
          INSERT INTO module_usage_events (
            tenant_id, module_code, event_name, actor_user_id, metadata
          )
          VALUES ($1, $2, $3, $4::uuid, $5::jsonb)
        `,
        [
          input.tenant_id,
          input.module_code,
          input.event_name,
          input.actor_user_id ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
    });
  }

  private async withTenantScope<T>(
    tenantId: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    return this.prisma.withRequestTransaction(async () => {
      await this.executeSql("SELECT set_config('app.tenant_id', $1, true)", [
        tenantId,
      ]);

      return callback();
    });
  }

  private async assertKnownActiveModules(moduleCodes: string[]): Promise<void> {
    const result = await this.executeSql<{ code: string }>(
      `
        SELECT code
        FROM module_registry
        WHERE code = ANY($1::text[])
          AND status = 'active'
      `,
      [moduleCodes],
    );
    const knownCodes = new Set(result.rows.map((row) => row.code));
    const missing = moduleCodes.find((code) => !knownCodes.has(code));

    if (missing) {
      throw new Error(`Unknown or inactive module code: ${missing}`);
    }
  }

  private async appendAuditLog(input: {
    tenantId: string;
    actorUserId: string | null;
    action: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.executeSql(
      `
        INSERT INTO audit_logs (
          tenant_id,
          actor_user_id,
          request_id,
          action,
          resource_type,
          resource_id,
          metadata
        )
        VALUES ($1, $2::uuid, current_setting('app.request_id', true), $3, 'school_module_access', NULL, $4::jsonb)
      `,
      [
        input.tenantId,
        input.actorUserId,
        input.action,
        JSON.stringify(input.metadata),
      ],
    ).catch(() => undefined);
  }

  private mapRegistryRow(row: ModuleRegistryRow): ModuleRegistryResponseDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      feature_flags: this.toObject(row.feature_flags),
      status: row.status,
      base_price_cents: Number(row.base_price_cents ?? 0),
      per_student_price_cents: Number(row.per_student_price_cents ?? 0),
      billing_metadata: this.toObject(row.billing_metadata),
      category: row.category ?? 'operations',
      route_segment: row.route_segment ?? null,
      permission_scopes: this.toStringArray(row.permission_scopes),
    };
  }

  private mapSchoolModuleRow(row: ModuleRegistryRow): SchoolModuleAccessResponseDto {
    return {
      ...this.mapRegistryRow(row),
      enabled: Boolean(row.enabled),
      enabled_at: row.enabled_at ? new Date(row.enabled_at).toISOString() : null,
      disabled_at: row.disabled_at ? new Date(row.disabled_at).toISOString() : null,
      updated_by: row.updated_by ?? null,
      access_level: row.access_level ?? 'standard',
      trial_ends_at: row.trial_ends_at ? new Date(row.trial_ends_at).toISOString() : null,
      expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      billing_plan_code: row.billing_plan_code ?? null,
      assignment_feature_flags: this.toObject(row.assignment_feature_flags),
    };
  }

  private toObject(value: Record<string, unknown> | string | null | undefined): Record<string, unknown> {
    if (!value) {
      return {};
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return {};
      }
    }

    return value;
  }

  private toStringArray(value: string[] | string | null | undefined): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }

    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
}
