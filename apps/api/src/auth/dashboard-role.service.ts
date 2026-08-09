import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';

import {
  ACADEMIC_TEACHING_ROLE_CODES,
  DEFAULT_ROLE_CATALOG,
  DEFAULT_ROLE_MEMBER,
  DEFAULT_ROLE_PARENT,
  DEFAULT_ROLE_STUDENT,
  DEFAULT_ROLE_TEACHER,
  SCHOOL_STAFF_ROLE_CODES,
} from './auth.constants';
import {
  DashboardRoleContextDto,
  DashboardRoleOptionDto,
  DashboardRoleSource,
} from './dto/dashboard-role.dto';
import { TenantMembershipEntity } from './entities/tenant-membership.entity';
import { AuthorizationRepository } from './repositories/authorization.repository';
import {
  ActiveUserRoleAssignment,
  UserRoleAssignmentsRepository,
} from './repositories/user-role-assignments.repository';
import { TenantMembershipsRepository } from './repositories/tenant-memberships.repository';

const TEACHER_ELIGIBLE_ROLE_CODES = new Set<string>(ACADEMIC_TEACHING_ROLE_CODES);
const SUPPORTED_ADDITIONAL_DASHBOARD_ROLES = new Set<string>(SCHOOL_STAFF_ROLE_CODES);
const SUPPORTED_PRIMARY_DASHBOARD_ROLES = new Set<string>([
  ...SCHOOL_STAFF_ROLE_CODES,
  DEFAULT_ROLE_MEMBER,
  DEFAULT_ROLE_PARENT,
  DEFAULT_ROLE_STUDENT,
]);

interface ResolveDashboardRolesInput {
  user_id: string;
  tenant_id: string;
  active_role?: string | null;
}

export interface AuthorizedDashboardRole {
  role_id: string;
  role_code: string;
  context: DashboardRoleContextDto;
}

export interface DashboardRoleAuthorizationSet {
  context: DashboardRoleContextDto;
  roles: Array<Pick<AuthorizedDashboardRole, 'role_id' | 'role_code'>>;
}

@Injectable()
export class DashboardRoleService {
  constructor(
    private readonly tenantMembershipsRepository: TenantMembershipsRepository,
    private readonly userRoleAssignmentsRepository: UserRoleAssignmentsRepository,
    private readonly authorizationRepository: AuthorizationRepository,
  ) {}

  async getRoleContext(input: ResolveDashboardRolesInput): Promise<DashboardRoleContextDto> {
    const resolved = await this.resolveAssignedRoles(input.user_id, input.tenant_id);
    const activeRole = this.normalizeRoleCode(input.active_role ?? resolved.membership.role_code);
    return this.buildRoleContext(resolved.membership, resolved.assignments, activeRole);
  }

  async authorizeRole(
    input: ResolveDashboardRolesInput & { requested_role: string },
  ): Promise<AuthorizedDashboardRole> {
    const requestedRole = this.normalizeRoleCode(input.requested_role);
    const resolved = await this.resolveAssignedRoles(input.user_id, input.tenant_id);
    const context = this.buildRoleContext(
      resolved.membership,
      resolved.assignments,
      requestedRole,
    );

    if (requestedRole === resolved.membership.role_code) {
      return {
        role_id: resolved.membership.role_id,
        role_code: requestedRole,
        context,
      };
    }

    const directAssignment = resolved.assignments.find(
      (assignment) => this.normalizeRoleCode(assignment.role_code) === requestedRole,
    );

    if (directAssignment) {
      return {
        role_id: directAssignment.role_id,
        role_code: requestedRole,
        context,
      };
    }

    if (requestedRole === DEFAULT_ROLE_TEACHER && context.teacher_dashboard_eligible) {
      const teacherRole = await this.authorizationRepository.getRoleByCode(
        input.tenant_id,
        DEFAULT_ROLE_TEACHER,
      );

      return {
        role_id: teacherRole.id,
        role_code: DEFAULT_ROLE_TEACHER,
        context,
      };
    }

    throw new ForbiddenException('The requested dashboard role is not assigned to this account');
  }

  async getAuthorizedRoleSet(
    input: ResolveDashboardRolesInput,
  ): Promise<DashboardRoleAuthorizationSet> {
    const resolved = await this.resolveAssignedRoles(input.user_id, input.tenant_id);
    const activeRole = this.normalizeRoleCode(input.active_role ?? resolved.membership.role_code);
    const context = this.buildRoleContext(resolved.membership, resolved.assignments, activeRole);
    const primaryRole = this.normalizeRoleCode(resolved.membership.role_code);
    const directAssignments = new Map(
      resolved.assignments.map((assignment) => [
        this.normalizeRoleCode(assignment.role_code),
        assignment,
      ]),
    );
    const roles: DashboardRoleAuthorizationSet['roles'] = [];

    for (const availableRole of context.available_roles) {
      if (availableRole.role_code === primaryRole) {
        roles.push({
          role_id: resolved.membership.role_id,
          role_code: availableRole.role_code,
        });
        continue;
      }

      const directAssignment = directAssignments.get(availableRole.role_code);
      if (directAssignment) {
        roles.push({
          role_id: directAssignment.role_id,
          role_code: availableRole.role_code,
        });
        continue;
      }

      if (availableRole.role_code === DEFAULT_ROLE_TEACHER) {
        const teacherRole = await this.authorizationRepository.getRoleByCode(
          input.tenant_id,
          DEFAULT_ROLE_TEACHER,
        );
        roles.push({
          role_id: teacherRole.id,
          role_code: DEFAULT_ROLE_TEACHER,
        });
        continue;
      }

      throw new ForbiddenException('A dashboard role could not be bound to an authorized school role');
    }

    return { context, roles };
  }

  private async resolveAssignedRoles(userId: string, tenantId: string): Promise<{
    membership: TenantMembershipEntity;
    assignments: ActiveUserRoleAssignment[];
  }> {
    const membership = await this.tenantMembershipsRepository.findActiveMembership(
      userId,
      tenantId,
    );

    if (!membership) {
      throw new UnauthorizedException('User no longer has access to this tenant');
    }

    const assignments = (await this.userRoleAssignmentsRepository.findActiveRolesForUser(
      userId,
      tenantId,
    )).filter((assignment) =>
      assignment.tenant_id === tenantId
      && assignment.user_id === userId
      && assignment.scope_type?.trim().toUpperCase() === 'SCHOOL'
      && !assignment.scope_id?.trim(),
    );

    return { membership, assignments };
  }

  private buildAvailableRoles(
    membership: TenantMembershipEntity,
    assignments: ActiveUserRoleAssignment[],
  ): DashboardRoleOptionDto[] {
    const roles = new Map<string, DashboardRoleOptionDto>();
    const primaryRole = this.normalizeRoleCode(membership.role_code);

    if (!SUPPORTED_PRIMARY_DASHBOARD_ROLES.has(primaryRole)) {
      throw new ForbiddenException('The primary account role does not have a supported school dashboard');
    }

    this.mergeRole(roles, {
      role_code: primaryRole,
      role_name: membership.role_name || this.getCatalogRoleName(primaryRole),
      is_primary: true,
      is_teacher_mode: primaryRole === DEFAULT_ROLE_TEACHER,
      sources: ['primary_membership'],
    });

    for (const assignment of assignments) {
      const roleCode = this.normalizeRoleCode(assignment.role_code);

      if (!SUPPORTED_ADDITIONAL_DASHBOARD_ROLES.has(roleCode)) {
        continue;
      }

      this.mergeRole(roles, {
        role_code: roleCode,
        role_name: assignment.role_name || this.getCatalogRoleName(roleCode),
        is_primary: roleCode === primaryRole,
        is_teacher_mode: roleCode === DEFAULT_ROLE_TEACHER,
        sources: ['additional_assignment'],
      });
    }

    const teacherEligible = [...roles.keys()].some((roleCode) =>
      TEACHER_ELIGIBLE_ROLE_CODES.has(roleCode),
    );

    if (teacherEligible && !roles.has(DEFAULT_ROLE_TEACHER)) {
      this.mergeRole(roles, {
        role_code: DEFAULT_ROLE_TEACHER,
        role_name: this.getCatalogRoleName(DEFAULT_ROLE_TEACHER),
        is_primary: false,
        is_teacher_mode: true,
        sources: ['teacher_eligibility'],
      });
    }

    return [...roles.values()];
  }

  private buildRoleContext(
    membership: TenantMembershipEntity,
    assignments: ActiveUserRoleAssignment[],
    activeRole: string,
  ): DashboardRoleContextDto {
    const availableRoles = this.buildAvailableRoles(membership, assignments);

    if (!availableRoles.some((role) => role.role_code === activeRole)) {
      throw new ForbiddenException('The active dashboard role is no longer assigned to this account');
    }

    const assignedRoles = availableRoles
      .filter((role) => !role.sources.includes('teacher_eligibility'))
      .map((role) => role.role_code);

    return {
      primary_role: this.normalizeRoleCode(membership.role_code),
      active_role: activeRole,
      assigned_roles: assignedRoles,
      available_roles: availableRoles,
      teacher_dashboard_eligible: availableRoles.some((role) => role.is_teacher_mode),
    };
  }

  private mergeRole(
    roles: Map<string, DashboardRoleOptionDto>,
    nextRole: DashboardRoleOptionDto,
  ): void {
    const existing = roles.get(nextRole.role_code);

    if (!existing) {
      roles.set(nextRole.role_code, nextRole);
      return;
    }

    const sources = new Set<DashboardRoleSource>([...existing.sources, ...nextRole.sources]);
    roles.set(nextRole.role_code, {
      ...existing,
      is_primary: existing.is_primary || nextRole.is_primary,
      is_teacher_mode: existing.is_teacher_mode || nextRole.is_teacher_mode,
      sources: [...sources],
    });
  }

  private getCatalogRoleName(roleCode: string): string {
    return DEFAULT_ROLE_CATALOG.find((role) => role.code === roleCode)?.name
      ?? roleCode.replaceAll('_', ' ');
  }

  private normalizeRoleCode(roleCode: string): string {
    return roleCode.trim().toLowerCase();
  }
}
