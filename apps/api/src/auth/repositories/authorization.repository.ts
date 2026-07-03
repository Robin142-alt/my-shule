import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { DEFAULT_PERMISSION_CATALOG, DEFAULT_ROLE_CATALOG } from '../auth.constants';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';

interface PermissionRow {
  id: string;
  tenant_id: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

interface RoleRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AuthorizationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async ensureTenantAuthorizationBaseline(tenantId: string): Promise<void> {
    await this.databaseService.query<PermissionRow>(
      `
        WITH catalog AS (
          SELECT
            resource,
            action,
            description,
            lower(
              $1::text || '.' ||
              regexp_replace(resource, '[^a-zA-Z0-9]+', '_', 'g') || '.' ||
              regexp_replace(action, '[^a-zA-Z0-9]+', '_', 'g') || '.tenant'
            ) AS permission_key,
            upper(
              regexp_replace($1::text, '[^a-zA-Z0-9]+', '_', 'g') || '_' ||
              regexp_replace(resource, '[^a-zA-Z0-9]+', '_', 'g') || '_' ||
              regexp_replace(action, '[^a-zA-Z0-9]+', '_', 'g')
            ) AS permission_code
          FROM jsonb_to_recordset($2::jsonb) AS permission(
            resource text,
            action text,
            description text
          )
        )
        INSERT INTO permissions (tenant_id, code, module, resource, action, scope, key, description, created_at, updated_at)
        SELECT $1, permission_code, resource, resource, action, 'tenant', permission_key, description, NOW(), NOW()
        FROM catalog
        ON CONFLICT (tenant_id, resource, action)
        DO UPDATE SET
          code = EXCLUDED.code,
          module = EXCLUDED.module,
          scope = EXCLUDED.scope,
          key = EXCLUDED.key,
          description = EXCLUDED.description,
          updated_at = NOW()
        RETURNING id, tenant_id, resource, action, description, created_at, updated_at
      `,
      [tenantId, JSON.stringify(DEFAULT_PERMISSION_CATALOG)],
    );

    await this.databaseService.query<RoleRow>(
      `
        WITH catalog AS (
          SELECT code, name, description
          FROM jsonb_to_recordset($2::jsonb) AS role(
            code text,
            name text,
            description text
          )
        )
        INSERT INTO roles (tenant_id, code, name, description, is_system, created_at, updated_at)
        SELECT $1, code, name, description, TRUE, NOW(), NOW()
        FROM catalog
        ON CONFLICT (tenant_id, code)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_system = TRUE,
          updated_at = NOW()
        RETURNING id, tenant_id, code, name, description, is_system, created_at, updated_at
      `,
      [tenantId, JSON.stringify(DEFAULT_ROLE_CATALOG.map(({ code, name, description }) => ({ code, name, description })))],
    );

    const rolePermissionCatalog = DEFAULT_ROLE_CATALOG.flatMap((role) =>
      role.permissions.map((permissionKey) => ({
        role_code: role.code,
        ...this.fromPermissionKey(permissionKey),
      })),
    );

    await this.databaseService.query(
      `
        WITH catalog AS (
          SELECT role_code, resource, action
          FROM jsonb_to_recordset($2::jsonb) AS role_permission(
            role_code text,
            resource text,
            action text
          )
        ),
        resolved AS (
          SELECT DISTINCT
            $1::text AS tenant_id,
            roles.id AS role_id,
            permissions.id AS permission_id,
            gen_random_uuid() AS role_permission_id
          FROM catalog
          INNER JOIN roles
            ON roles.tenant_id = $1
           AND roles.code = catalog.role_code
          INNER JOIN permissions
            ON permissions.tenant_id = $1
           AND permissions.resource = catalog.resource
             AND permissions.action = catalog.action
        )
        INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, created_at, updated_at)
        SELECT role_permission_id, tenant_id, role_id, permission_id, NOW(), NOW()
        FROM resolved
        ON CONFLICT (tenant_id, role_id, permission_id)
        DO NOTHING
      `,
      [tenantId, JSON.stringify(rolePermissionCatalog)],
    );
  }

  async getRoleByCode(tenantId: string, code: string): Promise<RoleEntity> {
    const result = await this.databaseService.query<RoleRow>(
      `
        SELECT id, tenant_id, code, name, description, is_system, created_at, updated_at
        FROM roles
        WHERE tenant_id = $1 AND code = $2
        LIMIT 1
      `,
      [tenantId, code],
    );

    if (!result.rows[0]) {
      throw new NotFoundException(`Role "${code}" was not found for tenant "${tenantId}"`);
    }

    return this.mapRole(result.rows[0]);
  }

  async getPermissionsByRoleId(tenantId: string, roleId: string): Promise<string[]> {
    const result = await this.databaseService.query<PermissionRow>(
      `
        SELECT p.id, p.tenant_id, p.resource, p.action, p.description, p.created_at, p.updated_at
        FROM role_permissions rp
        INNER JOIN permissions p
          ON p.id = rp.permission_id
         AND p.tenant_id = rp.tenant_id
        WHERE rp.tenant_id = $1
          AND rp.role_id = $2
        ORDER BY p.resource ASC, p.action ASC
      `,
      [tenantId, roleId],
    );

    return result.rows.map((row) => this.asPermissionKey(row.resource, row.action));
  }

  private asPermissionKey(resource: string, action: string): string {
    return `${resource}:${action}`;
  }

  private fromPermissionKey(permissionKey: string): { resource: string; action: string } {
    const separatorIndex = permissionKey.indexOf(':');

    if (separatorIndex === -1) {
      return { resource: permissionKey, action: '' };
    }

    return {
      resource: permissionKey.slice(0, separatorIndex),
      action: permissionKey.slice(separatorIndex + 1),
    };
  }

  private mapRole(row: RoleRow): RoleEntity {
    return Object.assign(new RoleEntity(), row);
  }

  private mapPermission(row: PermissionRow): PermissionEntity {
    return Object.assign(new PermissionEntity(), row);
  }
}
