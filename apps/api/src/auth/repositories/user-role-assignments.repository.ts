import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

export interface ActiveUserRoleAssignment {
  assignment_id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  role_code: string;
  role_name: string;
  scope_type: string;
  scope_id: string | null;
}

@Injectable()
export class UserRoleAssignmentsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveRolesForUser(
    userId: string,
    tenantId: string,
  ): Promise<ActiveUserRoleAssignment[]> {
    const result = await this.databaseService.query<ActiveUserRoleAssignment>(
      `
        SELECT
          user_role.id::text AS assignment_id,
          user_role.tenant_id,
          user_role.user_id::text,
          user_role.role_id::text,
          role.code AS role_code,
          role.name AS role_name,
          user_role.scope_type,
          user_role.scope_id
        FROM user_roles user_role
        INNER JOIN roles role
          ON role.id = user_role.role_id
         AND role.tenant_id = user_role.tenant_id
        WHERE user_role.tenant_id = $1
          AND user_role.user_id = $2
          AND upper(user_role.status) = 'ACTIVE'
          AND user_role.deleted_at IS NULL
          AND upper(COALESCE(user_role.scope_type, '')) = 'SCHOOL'
          AND NULLIF(btrim(COALESCE(user_role.scope_id, '')), '') IS NULL
        ORDER BY user_role.created_at ASC, role.code ASC
      `,
      [tenantId, userId],
    );

    return result.rows;
  }
}
