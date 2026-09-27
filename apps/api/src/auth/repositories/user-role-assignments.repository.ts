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
  private subjectAppointmentsAvailable = false;

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

    // Auth-only deployments can operate before the academics module is initialized.
    // Cache only positive discovery so a later module bootstrap becomes visible.
    if (!this.subjectAppointmentsAvailable) {
      const schema = await this.databaseService.query<{ available: boolean }>(`
        SELECT to_regclass('academics_role_appointments') IS NOT NULL
          AND to_regclass('subjects') IS NOT NULL AS available
      `);
      this.subjectAppointmentsAvailable = schema.rows[0]?.available === true;
    }
    if (!this.subjectAppointmentsAvailable) return result.rows;

    const appointments = await this.databaseService.query<ActiveUserRoleAssignment>(`
        SELECT appointment.id::text AS assignment_id,
          appointment.tenant_id, appointment.teacher_user_id::text AS user_id,
          role.id::text AS role_id, role.code AS role_code, role.name AS role_name,
          'SCHOOL' AS scope_type, NULL::text AS scope_id
        FROM academics_role_appointments appointment
        INNER JOIN roles role ON role.tenant_id = appointment.tenant_id AND role.code = 'head_of_subject'
        INNER JOIN tenant_memberships membership
          ON membership.tenant_id = appointment.tenant_id AND membership.user_id = appointment.teacher_user_id
          AND membership.status = 'active'
        INNER JOIN subjects subject
          ON subject.tenant_id = appointment.tenant_id AND subject.id::text = appointment.subject_id
        WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2
          AND appointment.role_type IN ('head_of_subject', 'hos', 'subject_coordinator')
          AND appointment.status = 'active' AND appointment.effective_from <= CURRENT_DATE
          AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
          AND subject.status = 'active' AND subject.archived_at IS NULL
        ORDER BY role_code, assignment_id
      `,
      [tenantId, userId],
    );

    return [...result.rows, ...appointments.rows];
  }
}
