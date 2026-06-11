import { Injectable, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class PermissionService {
  constructor(private readonly db: DatabaseService) {}

  async requireSchoolRole(userId: string, schoolId: string, allowedRoles: string[]) {
    // In our schema, role memberships might be in tenant_memberships or similar
    const result = await this.db.query(
      `SELECT role_id FROM tenant_memberships 
       WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'`,
      [userId, schoolId]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException('User is not an active member of this school');
    }

    // This requires a join with roles table to check if the role name is in allowedRoles
    const roleCheck = await this.db.query(
      `SELECT r.name FROM roles r
       JOIN tenant_memberships tm ON r.id = tm.role_id
       WHERE tm.user_id = $1 AND tm.tenant_id = $2 AND r.name = ANY($3)`,
      [userId, schoolId, allowedRoles]
    );

    if (roleCheck.rows.length === 0) {
      throw new ForbiddenException(`User does not have required roles: ${allowedRoles.join(', ')}`);
    }
    
    return true;
  }

  async requirePermission(userId: string, schoolId: string, permissionKey: string) {
    // Basic implementation: check if user has the specific permission in this tenant
    const result = await this.db.query(
      `SELECT 1 FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN tenant_memberships tm ON rp.role_id = tm.role_id
       WHERE tm.user_id = $1 AND tm.tenant_id = $2 AND p.key = $3`,
      [userId, schoolId, permissionKey]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException(`User lacks permission: ${permissionKey}`);
    }

    return true;
  }

  async requireModuleEnabled(schoolId: string, moduleKey: string) {
    // In MyShule, Super Admin enables modules via ModuleAccess
    const result = await this.db.query(
      `SELECT is_enabled FROM module_access WHERE tenant_id = $1 AND module_key = $2`,
      [schoolId, moduleKey]
    );

    if (result.rows.length === 0 || !result.rows[0].is_enabled) {
      throw new ForbiddenException(`Module ${moduleKey} is not enabled for this school`);
    }

    return true;
  }
}
