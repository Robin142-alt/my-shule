import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { RequestContextService } from '../common/request-context/request-context.service';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from '../modules/observability/audit-log.service';
import { SCHOOL_STAFF_ROLE_CODES } from './auth.constants';
import { AuthEmailService, EmailDeliveryError } from './auth-email.service';
import {
  CreateTenantInvitationDto,
  ListTenantUsersQueryDto,
  TENANT_INVITABLE_ROLE_CODES,
  TenantInvitationActionResponseDto,
  TenantManagedUserDto,
  TenantManagedUsersResponseDto,
  TenantInvitableRoleCode,
  TenantInvitationResponseDto,
  UpdateTenantMembershipProfileDto,
} from './dto/tenant-invitation.dto';
import { AuthorizationRepository } from './repositories/authorization.repository';

type TenantNameRow = {
  name: string;
};

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  platform_owner: 100,
  owner: 90,
  admin: 90,
  school_admin: 90,
  principal: 90,
  deputy_principal: 70,
  bursar: 60,
  hr_officer: 60,
  dean_academics: 50,
  exams_manager: 50,
  secretary: 40,
  admissions_officer: 40,
  ict_manager: 40,
  hod: 30,
  accountant: 30,
  librarian: 30,
  nurse: 30,
  school_counsellor: 30,
  discipline_master: 30,
  storekeeper: 30,
  boarding_master: 30,
  security_officer: 30,
  transport_manager: 30,
  lab_technician: 30,
  grade_master: 20,
  class_teacher: 15,
  teacher: 10,
  parent: 5,
  student: 5,
};

type TenantManagedUserRow = {
  id: string;
  kind: 'member' | 'invitation';
  display_name: string;
  email: string;
  role_code: string;
  role_name: string;
  status: 'active' | 'suspended' | 'revoked' | 'invited' | 'expired';
  phone?: string | null;
  department?: string | null;
  assignment?: string | null;
  tsc_number?: string | null;
  employment_type?: string | null;
  identifier?: string | null;
  delivery_method?: string | null;
  note?: string | null;
  expires_at: Date | string | null;
  created_at: Date | string;
};

type PendingInvitationRow = {
  id: string;
  email: string;
  display_name: string;
  role_code: string;
  role_name: string;
  invited_by_display_name: string;
  expires_at: Date | string;
};

type MembershipProfileTargetRow = {
  user_id: string;
  display_name: string;
  email: string;
};

type InvitationEmailDelivery = {
  sent: boolean;
  status: 'sent' | 'failed';
  message: string;
  failureCode?: string;
  actionRequired?: string;
  providerStatusCode?: number;
};

type PreparedInvitationDelivery = {
  invitationId: string;
  tenantId: string;
  email: string;
  displayName: string;
  roleCode: TenantInvitableRoleCode;
  roleName: string;
  inviteUrl: string;
  schoolName: string;
  inviterName: string;
  expiresAt: Date;
  outboxId?: string;
  invitationDetails: {
    phone?: string;
    department?: string;
    assignment?: string;
    identifier?: string;
    delivery_method?: 'Email' | 'SMS' | 'Copy link';
    note?: string;
  };
};

@Injectable()
export class TenantInvitationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly emailService: AuthEmailService,
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async inviteTenantUser(
    dto: CreateTenantInvitationDto,
  ): Promise<TenantInvitationResponseDto> {
    this.emailService.assertTransactionalEmailConfigured(
      'User invitations are temporarily unavailable. Please configure transactional email before inviting school users.',
    );

    const context = this.requestContext.requireStore();
    const tenantId = this.requireTenantId();

    if (tenantId.includes('demo')) {
      throw new BadRequestException('Demo environments cannot send real email invitations.');
    }

    const roleCode = this.normalizeRoleCode(dto.role_code);
    const email = dto.email.trim().toLowerCase();
    const displayName = dto.display_name.trim();
    const invitationDetails = this.normalizeInvitationDetails(dto);

    if (context.role) {
      const inviterLevel = ROLE_HIERARCHY[context.role] || 0;
      const inviteeLevel = ROLE_HIERARCHY[roleCode] || 0;
      
      if (inviterLevel < inviteeLevel) {
        throw new BadRequestException('You do not have permission to invite a user to a role with higher privileges.');
      }
      
      if (context.role === 'principal' && roleCode === 'principal') {
        throw new BadRequestException('A Principal cannot invite another Principal.');
      }
    }

    if (!displayName) {
      throw new BadRequestException('Invitee display name is required.');
    }

    const preparedInvitation = await this.databaseService.withRequestTransaction(async () => {
      await this.assertEmailAvailableForTenant(email, tenantId);
      
      await this.authorizationRepository.ensureTenantAuthorizationBaseline(tenantId);
      const role = await this.authorizationRepository.getRoleByCode(tenantId, roleCode);

      const schoolName = await this.getSchoolName(tenantId);
      const roleName = this.displayRoleName(role.name, roleCode);
      const inviterName = await this.getInviterName(context.user_id, 'Your school administrator');
      const token = randomBytes(32).toString('base64url');
      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + this.getInvitationTtlMs());
      const inviteUrl = this.buildInvitationUrl(token, tenantId);
      const payload = {
        tenant_id: tenantId,
        tenant_name: schoolName,
        role_code: roleCode,
        role_name: roleName,
        display_name: displayName,
        invited_by_user_id: context.user_id,
        invited_by_display_name: inviterName,
        purpose: 'tenant_user_invitation',
        expires_at: expiresAt.toISOString(),
        ...invitationDetails,
      };

      const invitation = await this.createInvitationAction({
        tenantId,
        email,
        tokenHash,
        expiresAt,
        payload,
      });
      await this.recordAudit('tenant.invitation.created', 'tenant_invitation', invitation.invitationId, {
        email,
        display_name: displayName,
        role_code: roleCode,
        ...invitationDetails,
        expires_at: expiresAt.toISOString(),
        email_delivery_status: 'queued',
      });

      return {
        id: invitation.invitationId,
        tenant_id: tenantId,
        email,
        display_name: displayName,
        role_code: roleCode,
        role_name: roleName,
        kind: 'invitation',
        ...invitationDetails,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        delivery: {
          invitationId: invitation.invitationId,
          tenantId,
          email,
          displayName,
          roleCode,
          roleName,
          inviteUrl,
          schoolName,
          inviterName,
          expiresAt,
          outboxId: invitation.outboxId,
          invitationDetails,
        },
      };
    });

    const delivery = await this.deliverInvitationEmail({
      outboxId: preparedInvitation.delivery.outboxId,
      to: preparedInvitation.delivery.email,
      displayName: preparedInvitation.delivery.displayName,
      schoolName: preparedInvitation.delivery.schoolName,
      assignedRole: preparedInvitation.delivery.roleName,
      inviterName: preparedInvitation.delivery.inviterName,
      inviteUrl: preparedInvitation.delivery.inviteUrl,
      expiresAt: preparedInvitation.delivery.expiresAt,
    });
    await this.recordInvitationDeliveryAudit(preparedInvitation.delivery, delivery);

    return {
      id: preparedInvitation.id,
      tenant_id: preparedInvitation.tenant_id,
      email: preparedInvitation.email,
      display_name: preparedInvitation.display_name,
      role_code: preparedInvitation.role_code,
      role_name: preparedInvitation.role_name,
      kind: 'invitation',
      status: delivery.sent ? 'invited' : 'email_failed',
      phone: preparedInvitation.phone,
      department: preparedInvitation.department,
      assignment: preparedInvitation.assignment,
      identifier: preparedInvitation.identifier,
      delivery_method: preparedInvitation.delivery_method,
      note: preparedInvitation.note,
      invitation_sent: delivery.sent,
      invitation_message: delivery.message,
      invitation_failure_code: delivery.failureCode,
      invitation_action_required: delivery.actionRequired,
      expires_at: preparedInvitation.expires_at,
      created_at: preparedInvitation.created_at,
    };
  }

  async listTenantUsers(
    query: ListTenantUsersQueryDto = {},
  ): Promise<TenantManagedUsersResponseDto> {
    const tenantId = this.requireTenantId();
    const search = this.normalizeSearchTerm(query.search);
    const roleCode = query.role_code ? this.normalizeRoleCode(query.role_code) : null;
    const status = query.status?.trim() || null;
    const limit = this.normalizeListLimit(query.limit);
    const offset = this.normalizeListOffset(query.offset);
    const result = await this.databaseService.query<TenantManagedUserRow>(
      `
        WITH current_members AS (
          SELECT
            tm.id::text AS id,
            'member'::text AS kind,
            COALESCE(NULLIF(tm.metadata->>'display_name', ''), u.display_name) AS display_name,
            lower(u.email) AS email,
            r.code AS role_code,
            r.name AS role_name,
            tm.status,
            NULLIF(tm.metadata->>'phone', '') AS phone,
            NULLIF(tm.metadata->>'department', '') AS department,
            NULLIF(tm.metadata->>'assignment', '') AS assignment,
            NULLIF(tm.metadata->>'tsc_number', '') AS tsc_number,
            NULLIF(tm.metadata->>'employment_type', '') AS employment_type,
            NULL::text AS identifier,
            NULL::text AS delivery_method,
            NULL::text AS note,
            NULL::timestamptz AS expires_at,
            tm.created_at
          FROM tenant_memberships tm
          INNER JOIN users u
            ON u.id = tm.user_id
          INNER JOIN roles r
            ON r.id = tm.role_id
           AND r.tenant_id = tm.tenant_id
          WHERE tm.tenant_id = $1
            AND tm.status IN ('active', 'suspended', 'revoked')
            AND (
              $2::text IS NULL
              OR lower(u.display_name) LIKE $2::text
              OR lower(u.email) LIKE $2::text
            )
        ),
        pending_invitations AS (
          SELECT
            token.id::text AS id,
            'invitation'::text AS kind,
            COALESCE(NULLIF(token.metadata->>'display_name', ''), token.email) AS display_name,
            lower(token.email) AS email,
            COALESCE(NULLIF(token.metadata->>'role_code', ''), 'member') AS role_code,
            COALESCE(role.name, initcap(replace(COALESCE(NULLIF(token.metadata->>'role_code', ''), 'member'), '_', ' '))) AS role_name,
            CASE
              WHEN token.expires_at <= NOW() THEN 'expired'
              ELSE 'invited'
            END AS status,
            NULLIF(token.metadata->>'phone', '') AS phone,
            NULLIF(token.metadata->>'department', '') AS department,
            NULLIF(token.metadata->>'assignment', '') AS assignment,
            NULLIF(token.metadata->>'tsc_number', '') AS tsc_number,
            NULLIF(token.metadata->>'employment_type', '') AS employment_type,
            NULLIF(token.metadata->>'identifier', '') AS identifier,
            NULLIF(token.metadata->>'delivery_method', '') AS delivery_method,
            NULLIF(token.metadata->>'note', '') AS note,
            token.expires_at,
            token.created_at
          FROM auth_action_tokens token
          LEFT JOIN roles role
            ON role.tenant_id = token.tenant_id
           AND role.code = COALESCE(NULLIF(token.metadata->>'role_code', ''), 'member')
          WHERE token.tenant_id = $1
            AND token.purpose = 'invite_acceptance'
            AND token.consumed_at IS NULL
            AND token.metadata->>'purpose' = 'tenant_user_invitation'
            AND (
              $2::text IS NULL
              OR lower(COALESCE(NULLIF(token.metadata->>'display_name', ''), token.email)) LIKE $2::text
              OR lower(token.email) LIKE $2::text
            )
        )
        SELECT
          managed_users.id,
          managed_users.kind,
          managed_users.display_name,
          managed_users.email,
          managed_users.role_code,
          managed_users.role_name,
          managed_users.status,
          managed_users.phone,
          managed_users.department,
          managed_users.assignment,
          managed_users.tsc_number,
          managed_users.employment_type,
          managed_users.identifier,
          managed_users.delivery_method,
          managed_users.note,
          managed_users.expires_at,
          managed_users.created_at
        FROM (
          SELECT
            id,
            kind,
            display_name,
            email,
            role_code,
            role_name,
            status,
            phone,
            department,
            assignment,
            tsc_number,
            employment_type,
            identifier,
            delivery_method,
            note,
            expires_at,
            created_at
          FROM pending_invitations
          UNION ALL
          SELECT
            id,
            kind,
            display_name,
            email,
            role_code,
            role_name,
            status,
            phone,
            department,
            assignment,
            tsc_number,
            employment_type,
            identifier,
            delivery_method,
            note,
            expires_at,
            created_at
          FROM current_members
        ) managed_users
        WHERE ($3::text IS NULL OR managed_users.role_code = $3::text)
          AND ($4::text IS NULL OR managed_users.status = $4::text)
        ORDER BY
          CASE managed_users.kind WHEN 'invitation' THEN 0 ELSE 1 END,
          managed_users.created_at DESC
        LIMIT $5::integer
        OFFSET $6::integer
      `,
      [tenantId, search, roleCode, status, limit, offset],
    );

    return {
      users: result.rows.map((row) => this.mapManagedUser(row)),
      pagination: {
        limit,
        offset,
        returned: result.rows.length,
      },
    };
  }

  async resendTenantInvitation(
    invitationId: string,
  ): Promise<TenantInvitationActionResponseDto> {
    this.emailService.assertTransactionalEmailConfigured(
      'User invitations are temporarily unavailable. Please configure transactional email before inviting school users.',
    );

    const tenantId = this.requireTenantId();

    const preparedInvitation = await this.databaseService.withRequestTransaction(async () => {
      const invitation = await this.loadPendingTenantInvitationForUpdate(invitationId, tenantId);
      
      await this.assertEmailAvailableForTenant(invitation.email, tenantId);

      const roleCode = this.normalizeRoleCode(invitation.role_code);
      const role = await this.authorizationRepository.getRoleByCode(tenantId, roleCode);
      const schoolName = await this.getSchoolName(tenantId);
      const roleName = this.displayRoleName(role.name || invitation.role_name, roleCode);
      const inviterName = await this.getInviterName(
        this.requestContext.requireStore().user_id,
        invitation.invited_by_display_name || 'Your school administrator',
      );
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + this.getInvitationTtlMs());
      const inviteUrl = this.buildInvitationUrl(token, tenantId);
      const metadata = {
        tenant_id: tenantId,
        tenant_name: schoolName,
        role_code: roleCode,
        role_name: roleName,
        display_name: invitation.display_name,
        invited_by_user_id: this.requestContext.requireStore().user_id,
        invited_by_display_name: inviterName,
        purpose: 'tenant_user_invitation',
        expires_at: expiresAt.toISOString(),
        resent_at: new Date().toISOString(),
      };

      await this.databaseService.query(
        `
          UPDATE auth_action_tokens
          SET
            token_hash = $3,
            expires_at = $4,
            metadata = $5::jsonb,
            updated_at = NOW()
          WHERE id = $1
            AND tenant_id = $2
            AND purpose = 'invite_acceptance'
            AND consumed_at IS NULL
        `,
        [
          invitationId,
          tenantId,
          this.hashToken(token),
          expiresAt,
          JSON.stringify(metadata),
        ],
      );

      const outboxId = await this.queueInvitationEmail({
        tenantId,
        email: invitation.email.toLowerCase(),
        payload: metadata,
      });

      await this.recordAudit('tenant.invitation.resent', 'tenant_invitation', invitationId, {
        email: invitation.email.toLowerCase(),
        display_name: invitation.display_name,
        role_code: roleCode,
        expires_at: expiresAt.toISOString(),
        email_delivery_status: 'queued',
      });

      return {
        invitationId,
        tenantId,
        email: invitation.email.toLowerCase(),
        displayName: invitation.display_name,
        roleCode,
        roleName,
        inviteUrl,
        schoolName,
        inviterName,
        expiresAt,
        outboxId,
        invitationDetails: {},
      };
    });

    const delivery = await this.deliverInvitationEmail({
      outboxId: preparedInvitation.outboxId,
      to: preparedInvitation.email,
      displayName: preparedInvitation.displayName,
      schoolName: preparedInvitation.schoolName,
      assignedRole: preparedInvitation.roleName,
      inviterName: preparedInvitation.inviterName,
      inviteUrl: preparedInvitation.inviteUrl,
      expiresAt: preparedInvitation.expiresAt,
    });
    await this.recordInvitationDeliveryAudit(preparedInvitation, delivery);

    return {
      id: invitationId,
      status: delivery.sent ? 'invited' : 'email_failed',
      invitation_sent: delivery.sent,
      invitation_message: delivery.message,
      invitation_failure_code: delivery.failureCode,
      invitation_action_required: delivery.actionRequired,
      expires_at: preparedInvitation.expiresAt.toISOString(),
    };
  }

  async revokeTenantInvitation(
    invitationId: string,
  ): Promise<TenantInvitationActionResponseDto> {
    const tenantId = this.requireTenantId();
    const context = this.requestContext.requireStore();
    const result = await this.databaseService.query<{ id: string }>(
      `
        UPDATE auth_action_tokens
        SET
          consumed_at = NOW(),
          metadata = metadata || jsonb_build_object(
            'status', 'revoked',
            'revoked_by_user_id', $3,
            'revoked_at', NOW()
          ),
          updated_at = NOW()
        WHERE id = $1
          AND tenant_id = $2
          AND purpose = 'invite_acceptance'
          AND consumed_at IS NULL
          AND metadata->>'purpose' = 'tenant_user_invitation'
        RETURNING id::text
      `,
      [invitationId, tenantId, context.user_id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Pending invitation was not found.');
    }
    await this.recordAudit('tenant.invitation.revoked', 'tenant_invitation', result.rows[0].id, {
      revoked_by_user_id: context.user_id,
    });

    return { id: result.rows[0].id, status: 'revoked' };
  }

  async updateTenantMembershipStatus(
    membershipId: string,
    status: 'active' | 'suspended' | 'revoked',
  ): Promise<TenantManagedUserDto> {
    if (status !== 'active' && status !== 'suspended' && status !== 'revoked') {
      throw new BadRequestException('Tenant membership status must be active, suspended, or revoked.');
    }

    const tenantId = this.requireTenantId();
    const staffStatus = status === 'revoked' ? 'archived' : status;
    return this.databaseService.withRequestTransaction(async () => {
      const result = await this.databaseService.query<TenantManagedUserRow>(
        `
          UPDATE tenant_memberships tm
          SET
            status = $3,
            updated_at = NOW()
          FROM users u, roles r
          WHERE tm.id = $1
            AND tm.tenant_id = $2
            AND u.id = tm.user_id
            AND r.id = tm.role_id
            AND r.tenant_id = tm.tenant_id
          RETURNING
            tm.id::text AS id,
            'member'::text AS kind,
            COALESCE(NULLIF(tm.metadata->>'display_name', ''), u.display_name) AS display_name,
            lower(u.email) AS email,
            r.code AS role_code,
            r.name AS role_name,
            tm.status,
            NULLIF(tm.metadata->>'phone', '') AS phone,
            NULLIF(tm.metadata->>'department', '') AS department,
            NULLIF(tm.metadata->>'assignment', '') AS assignment,
            NULLIF(tm.metadata->>'tsc_number', '') AS tsc_number,
            NULLIF(tm.metadata->>'employment_type', '') AS employment_type,
            NULL::text AS identifier,
            NULL::text AS delivery_method,
            NULL::text AS note,
            NULL::timestamptz AS expires_at,
            tm.created_at
        `,
        [membershipId, tenantId, status],
      );

      if (!result.rows[0]) {
        throw new NotFoundException('Tenant membership was not found.');
      }

      const membership = this.mapManagedUser(result.rows[0]);

      await this.databaseService.query(
        `
          INSERT INTO staff_profiles (
            tenant_id,
            user_id,
            display_name,
            status,
            created_at,
            updated_at
          )
          SELECT
            tm.tenant_id,
            tm.user_id,
            COALESCE(
              NULLIF(u.display_name, ''),
              NULLIF(u.full_name, ''),
              u.email,
              tm.user_id::text
            ),
            $5,
            NOW(),
            NOW()
          FROM tenant_memberships tm
          JOIN users u
            ON u.id = tm.user_id
          JOIN roles r
            ON r.id = tm.role_id
           AND r.tenant_id = tm.tenant_id
          WHERE tm.id = $1
            AND tm.tenant_id = $2
            AND r.code = ANY($4::text[])
          ON CONFLICT (tenant_id, user_id)
            WHERE user_id IS NOT NULL
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            status = EXCLUDED.status,
            updated_at = NOW()
        `,
        [membershipId, tenantId, status, [...SCHOOL_STAFF_ROLE_CODES], staffStatus],
      );

      await this.recordAudit('tenant.membership.status_changed', 'tenant_membership', membership.id, {
        email: membership.email,
        display_name: membership.display_name,
        status,
        role_code: membership.role_code,
      });

      return membership;
    });
  }

  async updateTenantMembershipProfile(
    membershipId: string,
    dto: UpdateTenantMembershipProfileDto,
  ): Promise<TenantManagedUserDto> {
    const tenantId = this.requireTenantId();
    const email = dto.email.trim().toLowerCase();

    return this.databaseService.withRequestTransaction(async () => {
      const targetResult = await this.databaseService.query<MembershipProfileTargetRow>(
        `
          SELECT
            tm.user_id::text AS user_id,
            COALESCE(NULLIF(tm.metadata->>'display_name', ''), u.display_name) AS display_name,
            lower(u.email) AS email
          FROM tenant_memberships tm
          JOIN users u
            ON u.id = tm.user_id
          WHERE tm.id = $1
            AND tm.tenant_id = $2
          LIMIT 1
          FOR UPDATE OF tm, u
        `,
        [membershipId, tenantId],
      );
      const target = targetResult.rows[0];

      if (!target) {
        throw new NotFoundException('Tenant membership was not found.');
      }

      const conflictResult = await this.databaseService.query<{ id: string }>(
        `
          SELECT id::text AS id
          FROM users
          WHERE lower(email) = $1
            AND id <> $2
          LIMIT 1
        `,
        [email, target.user_id],
      );

      if (conflictResult.rows[0]) {
        throw new BadRequestException('That email address is already used by another MyShule account.');
      }

      await this.databaseService.query(
        `
          UPDATE users
          SET
            display_name = $2,
            full_name = $2,
            email = $3,
            updated_at = NOW()
          WHERE id = $1
        `,
        [target.user_id, dto.display_name, email],
      );

      const result = await this.databaseService.query<TenantManagedUserRow>(
        `
          UPDATE tenant_memberships tm
          SET
            metadata = COALESCE(tm.metadata, '{}'::jsonb) || jsonb_build_object(
              'display_name', $3::text,
              'phone', $4::text,
              'department', $5::text,
              'assignment', $6::text,
              'tsc_number', $7::text,
              'employment_type', $8::text
            ),
            updated_at = NOW()
          FROM users u, roles r
          WHERE tm.id = $1
            AND tm.tenant_id = $2
            AND u.id = tm.user_id
            AND r.id = tm.role_id
            AND r.tenant_id = tm.tenant_id
          RETURNING
            tm.id::text AS id,
            'member'::text AS kind,
            COALESCE(NULLIF(tm.metadata->>'display_name', ''), u.display_name) AS display_name,
            lower(u.email) AS email,
            r.code AS role_code,
            r.name AS role_name,
            tm.status,
            NULLIF(tm.metadata->>'phone', '') AS phone,
            NULLIF(tm.metadata->>'department', '') AS department,
            NULLIF(tm.metadata->>'assignment', '') AS assignment,
            NULLIF(tm.metadata->>'tsc_number', '') AS tsc_number,
            NULLIF(tm.metadata->>'employment_type', '') AS employment_type,
            NULL::text AS identifier,
            NULL::text AS delivery_method,
            NULL::text AS note,
            NULL::timestamptz AS expires_at,
            tm.created_at
        `,
        [
          membershipId,
          tenantId,
          dto.display_name,
          dto.phone ?? '',
          dto.department ?? '',
          dto.assignment ?? '',
          dto.tsc_number ?? '',
          dto.employment_type ?? '',
        ],
      );
      const membership = result.rows[0];

      if (!membership) {
        throw new NotFoundException('Tenant membership was not found.');
      }

      const mappedMembership = this.mapManagedUser(membership);
      await this.recordAudit('tenant.membership.profile_changed', 'tenant_membership', membership.id, {
        old_display_name: target.display_name,
        new_display_name: mappedMembership.display_name,
        old_email: target.email,
        new_email: mappedMembership.email,
      });

      return mappedMembership;
    });
  }

  async updateTenantMembershipRole(
    membershipId: string,
    roleCodeInput: string,
  ): Promise<TenantManagedUserDto> {
    const tenantId = this.requireTenantId();
    const roleCode = this.normalizeRoleCode(roleCodeInput);
    const context = this.requestContext.requireStore();

    if (context.role) {
      const inviterLevel = ROLE_HIERARCHY[context.role] || 0;
      const inviteeLevel = ROLE_HIERARCHY[roleCode] || 0;
      
      if (inviterLevel < inviteeLevel) {
        throw new BadRequestException('You do not have permission to grant a role with higher privileges.');
      }
    }

    await this.authorizationRepository.ensureTenantAuthorizationBaseline(tenantId);
    const role = await this.authorizationRepository.getRoleByCode(tenantId, roleCode);

    const result = await this.databaseService.query<TenantManagedUserRow>(
      `
        UPDATE tenant_memberships tm
        SET
          role_id = $3,
          updated_at = NOW()
        FROM users u, roles r
        WHERE tm.id = $1
          AND tm.tenant_id = $2
          AND u.id = tm.user_id
          AND r.id = $3
          AND r.tenant_id = tm.tenant_id
        RETURNING
          tm.id::text AS id,
          'member'::text AS kind,
          COALESCE(NULLIF(tm.metadata->>'display_name', ''), u.display_name) AS display_name,
          lower(u.email) AS email,
          r.code AS role_code,
          r.name AS role_name,
          tm.status,
          NULLIF(tm.metadata->>'phone', '') AS phone,
          NULLIF(tm.metadata->>'department', '') AS department,
          NULLIF(tm.metadata->>'assignment', '') AS assignment,
          NULLIF(tm.metadata->>'tsc_number', '') AS tsc_number,
          NULLIF(tm.metadata->>'employment_type', '') AS employment_type,
          NULL::text AS identifier,
          NULL::text AS delivery_method,
          NULL::text AS note,
          NULL::timestamptz AS expires_at,
          tm.created_at
      `,
      [membershipId, tenantId, role.id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Tenant membership was not found.');
    }

    const membership = this.mapManagedUser(result.rows[0]);
    await this.recordAudit('tenant.membership.role_changed', 'tenant_membership', membership.id, {
      email: membership.email,
      display_name: membership.display_name,
      role_code: roleCode,
      role_name: membership.role_name,
    });

    return membership;
  }

  private normalizeRoleCode(roleCode: string): TenantInvitableRoleCode {
    const normalizedRoleCode = roleCode.trim().toLowerCase();

    if (!TENANT_INVITABLE_ROLE_CODES.includes(normalizedRoleCode as TenantInvitableRoleCode)) {
      throw new BadRequestException(`Unsupported invitation role "${roleCode}".`);
    }

    return normalizedRoleCode as TenantInvitableRoleCode;
  }

  private normalizeInvitationDetails(
    dto: CreateTenantInvitationDto,
  ): {
    phone?: string;
    department?: string;
    assignment?: string;
    identifier?: string;
    delivery_method?: 'Email' | 'SMS' | 'Copy link';
    note?: string;
  } {
    const details: {
      phone?: string;
      department?: string;
      assignment?: string;
      identifier?: string;
      delivery_method?: 'Email' | 'SMS' | 'Copy link';
      note?: string;
    } = {};

    if (dto.phone?.trim()) {
      details.phone = dto.phone.trim();
    }

    if (dto.department?.trim()) {
      details.department = dto.department.trim();
    }

    if (dto.assignment?.trim()) {
      details.assignment = dto.assignment.trim();
    }

    if (dto.identifier?.trim()) {
      details.identifier = dto.identifier.trim();
    }

    if (dto.delivery_method?.trim()) {
      details.delivery_method = dto.delivery_method;
    }

    if (dto.note?.trim()) {
      details.note = dto.note.trim();
    }

    return details;
  }

  private normalizeSearchTerm(search: string | undefined): string | null {
    const normalized = search?.trim().toLowerCase() ?? '';

    if (normalized.length < 2) {
      return null;
    }

    return `%${normalized}%`;
  }

  private normalizeListLimit(limit: number | undefined): number {
    const parsed = Number(limit ?? 25);

    if (!Number.isFinite(parsed)) {
      return 25;
    }

    return Math.min(Math.max(Math.trunc(parsed), 1), 50);
  }

  private normalizeListOffset(offset: number | undefined): number {
    const parsed = Number(offset ?? 0);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(Math.trunc(parsed), 0);
  }

  private requireTenantId(): string {
    const context = this.requestContext.requireStore();
    const tenantId = context.tenant_id?.trim();

    if (!tenantId) {
      throw new BadRequestException('A school tenant context is required to send invitations.');
    }

    return tenantId;
  }

  private async getSchoolName(tenantId: string): Promise<string> {
    const result = await this.databaseService.query<TenantNameRow>(
      `
        SELECT name FROM tenants
        WHERE tenant_id = $1
        LIMIT 1
      `,
      [tenantId],
    );

    return result.rows[0]?.name ?? tenantId;
  }

  private async assertEmailAvailableForTenant(email: string, targetTenantId: string): Promise<void> {
    const membershipConflict = await this.databaseService.query<{ tenant_id: string }>(
      `
        SELECT tm.tenant_id 
        FROM tenant_memberships tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE lower(u.email) = $1
          AND tm.tenant_id <> $2
        LIMIT 1
      `,
      [email.toLowerCase(), targetTenantId]
    );

    if (membershipConflict.rows.length > 0) {
      throw new BadRequestException('This email is already registered under another school. Use a different email address for this school.');
    }

    const invitationConflict = await this.databaseService.query<{ tenant_id: string }>(
      `
        SELECT tenant_id 
        FROM auth_action_tokens
        WHERE lower(email) = $1
          AND purpose = 'invite_acceptance'
          AND consumed_at IS NULL
          AND tenant_id <> $2
        LIMIT 1
      `,
      [email.toLowerCase(), targetTenantId]
    );

    if (invitationConflict.rows.length > 0) {
      throw new BadRequestException('This email is already registered under another school. Use a different email address for this school.');
    }
  }

  private async createInvitationAction(input: {
    tenantId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    payload: Record<string, unknown>;
  }): Promise<{ invitationId: string; outboxId?: string }> {
    await this.databaseService.query(
      `
        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE tenant_id = $1
          AND lower(email) = lower($2)
          AND purpose = 'invite_acceptance'
          AND consumed_at IS NULL
      `,
      [input.tenantId, input.email],
    );

    const invitationResult = await this.databaseService.query<{ id: string }>(
      `
        INSERT INTO auth_action_tokens (
          tenant_id,
          user_id,
          email,
          token_hash,
          purpose,
          expires_at,
          metadata
        )
        VALUES ($1, $2, $3, $4, 'invite_acceptance', $5, $6::jsonb)
        RETURNING id
      `,
      [
        input.tenantId,
        null,
        input.email,
        input.tokenHash,
        input.expiresAt,
        JSON.stringify(input.payload),
      ],
    );
    const invitationId = invitationResult.rows[0]?.id;

    if (!invitationId) {
      throw new Error('Invitation token could not be created.');
    }

    const outboxResult = await this.databaseService.query<{ id: string }>(
      `
        INSERT INTO auth_email_outbox (
          tenant_id,
          user_id,
          recipient_email,
          template,
          subject,
          payload,
          status
        )
        VALUES ($1, NULL, $2, 'invite_acceptance', $3, $4::jsonb, 'pending')
        RETURNING id
      `,
      [
        input.tenantId,
        input.email,
        'You have been invited to My Shule ERP',
        JSON.stringify(input.payload),
      ],
    );
    const outboxId = outboxResult.rows[0]?.id;

    return { invitationId, outboxId };
  }

  private async deliverInvitationEmail(input: {
    outboxId: string | undefined;
    to: string;
    displayName: string;
    schoolName: string;
    assignedRole: string;
    inviterName: string;
    inviteUrl: string;
    expiresAt: Date;
  }): Promise<InvitationEmailDelivery> {
    try {
      await this.emailService.sendInvitationEmail({
        to: input.to,
        displayName: input.displayName,
        schoolName: input.schoolName,
        assignedRole: input.assignedRole,
        inviterName: input.inviterName,
        inviteUrl: input.inviteUrl,
        expiresAt: input.expiresAt,
        supportNote: this.getInvitationSupportNote(),
      });
      await this.markOutboxDeliverySafely(input.outboxId, 'sent');
      return {
        sent: true,
        status: 'sent',
        message: 'Invitation email sent.',
      };
    } catch (error) {
      const delivery = this.invitationDeliveryFailureFromError(error);
      await this.markOutboxDeliverySafely(input.outboxId, 'failed', {
        errorCode: delivery.failureCode,
        errorSummary: delivery.message,
        providerStatusCode: delivery.providerStatusCode,
      });
      return delivery;
    }
  }

  private invitationDeliveryFailureFromError(error: unknown): InvitationEmailDelivery {
    if (error instanceof EmailDeliveryError) {
      return {
        sent: false,
        status: 'failed',
        message: error.safeMessage,
        failureCode: error.code,
        actionRequired:
          error.code === 'resend_domain_not_verified'
            ? 'Verify the Resend sending domain and set EMAIL_FROM to that verified domain, then resend the invitation.'
            : 'Fix transactional email delivery, then resend the pending invitation.',
        providerStatusCode: error.providerStatus,
      };
    }

    const message = error instanceof Error && error.message.trim()
      ? error.message.trim()
      : 'School invitation email could not be sent right now.';

    return {
      sent: false,
      status: 'failed',
      message,
      failureCode: 'provider_rejected',
      actionRequired: 'Fix transactional email delivery, then resend the pending invitation.',
    };
  }

  private async queueInvitationEmail(input: {
    tenantId: string;
    email: string;
    payload: Record<string, unknown>;
  }): Promise<string | undefined> {
    const outboxResult = await this.databaseService.query<{ id: string }>(
      `
        INSERT INTO auth_email_outbox (
          tenant_id,
          user_id,
          recipient_email,
          template,
          subject,
          payload,
          status
        )
        VALUES ($1, NULL, $2, 'invite_acceptance', $3, $4::jsonb, 'pending')
        RETURNING id
      `,
      [
        input.tenantId,
        input.email,
        'You have been invited to My Shule ERP',
        JSON.stringify(input.payload),
      ],
    );

    return outboxResult.rows[0]?.id;
  }

  private async loadPendingTenantInvitationForUpdate(
    invitationId: string,
    tenantId: string,
  ): Promise<PendingInvitationRow> {
    const result = await this.databaseService.query<PendingInvitationRow>(
      `
        SELECT
          id::text,
          lower(email) AS email,
          COALESCE(NULLIF(metadata->>'display_name', ''), email) AS display_name,
          COALESCE(NULLIF(metadata->>'role_code', ''), 'member') AS role_code,
          COALESCE(NULLIF(metadata->>'role_name', ''), initcap(replace(COALESCE(NULLIF(metadata->>'role_code', ''), 'member'), '_', ' '))) AS role_name,
          COALESCE(NULLIF(metadata->>'invited_by_display_name', ''), '') AS invited_by_display_name,
          expires_at
        FROM auth_action_tokens
        WHERE id = $1
          AND tenant_id = $2
          AND purpose = 'invite_acceptance'
          AND consumed_at IS NULL
          AND metadata->>'purpose' = 'tenant_user_invitation'
        LIMIT 1
        FOR UPDATE
      `,
      [invitationId, tenantId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Pending invitation was not found.');
    }

    return result.rows[0];
  }

  private mapManagedUser(row: TenantManagedUserRow): TenantManagedUserDto {
    return {
      id: row.id,
      kind: row.kind,
      display_name: row.display_name,
      email: row.email,
      role_code: row.role_code,
      role_name: row.role_name,
      status: row.status,
      phone: row.phone ?? null,
      department: row.department ?? null,
      assignment: row.assignment ?? null,
      tsc_number: row.tsc_number ?? null,
      employment_type: row.employment_type ?? null,
      identifier: row.identifier ?? null,
      delivery_method: row.delivery_method ?? null,
      note: row.note ?? null,
      expires_at: this.toIsoStringOrNull(row.expires_at),
      created_at: this.toIsoString(row.created_at),
    };
  }

  private toIsoString(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private toIsoStringOrNull(value: Date | string | null): string | null {
    return value ? this.toIsoString(value) : null;
  }

  private async recordAudit(
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogService?.record({
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
    });
  }

  private async recordAuditSafely(
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.recordAudit(action, resourceType, resourceId, metadata);
    } catch {
      // The invitation token is already durable at this point. Do not invalidate a delivered invite because delivery audit persistence failed.
    }
  }

  private async recordInvitationDeliveryAudit(
    invitation: PreparedInvitationDelivery,
    delivery: InvitationEmailDelivery,
  ): Promise<void> {
    if (delivery.sent) {
      await this.recordAuditSafely('tenant.invitation.email_sent', 'tenant_invitation', invitation.invitationId, {
        email: invitation.email,
        display_name: invitation.displayName,
        role_code: invitation.roleCode,
        email_delivery_status: delivery.status,
      });
      return;
    }

    await this.recordAuditSafely('tenant.invitation.email_failed', 'tenant_invitation', invitation.invitationId, {
      email: invitation.email,
      display_name: invitation.displayName,
      role_code: invitation.roleCode,
      failure_code: delivery.failureCode,
      failure_message: delivery.message,
    });
  }

  private async markOutboxDelivery(
    outboxId: string | undefined,
    status: 'sent' | 'failed',
    options: {
      errorCode?: string;
      errorSummary?: string;
      providerStatusCode?: number;
    } = {},
  ): Promise<void> {
    if (!outboxId) {
      return;
    }

    try {
      await this.databaseService.query(
        'SELECT app.mark_auth_email_outbox_delivery($1::uuid, $2::text, $3::text, $4::text, $5::integer)',
        [
          outboxId,
          status,
          options.errorCode ?? null,
          options.errorSummary ?? null,
          options.providerStatusCode ?? null,
        ],
      );
      return;
    } catch {
      await this.databaseService.query(
        `
          WITH _operation AS (
            SELECT set_config('app.auth_email_outbox_operation', 'mark_delivery', true)
          )
          UPDATE auth_email_outbox
          SET
            status = $1::text,
            attempts = attempts + 1,
            sent_at = CASE WHEN $1::text = 'sent' THEN NOW() ELSE sent_at END,
            last_error_code = CASE
              WHEN $1::text = 'sent' THEN NULL
              ELSE NULLIF($3::text, '')
            END,
            last_error_summary = CASE
              WHEN $1::text = 'sent' THEN NULL
              ELSE NULLIF($4::text, '')
            END,
            provider_status_code = CASE
              WHEN $1::text = 'sent' THEN NULL
              ELSE $5::integer
            END,
            last_attempt_at = NOW(),
            next_attempt_at = CASE
              WHEN $1::text = 'failed' THEN NOW() + INTERVAL '10 minutes'
              ELSE next_attempt_at
            END
          FROM _operation
          WHERE id = $2::uuid
          RETURNING id
        `,
        [
          status,
          outboxId,
          options.errorCode ?? null,
          options.errorSummary ?? null,
          options.providerStatusCode ?? null,
        ],
      );
    }
  }

  private async markOutboxDeliverySafely(
    outboxId: string | undefined,
    status: 'sent' | 'failed',
    options: {
      errorCode?: string;
      errorSummary?: string;
      providerStatusCode?: number;
    } = {},
  ): Promise<void> {
    try {
      await this.markOutboxDelivery(outboxId, status, options);
    } catch {
      // Provider delivery and invite token durability are the source of truth for the caller.
      // Outbox repair can be handled separately by operational monitoring.
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getInvitationTtlMs(): number {
    const ttlMinutes = Number(
      this.configService.get<number>('email.invitationTtlMinutes') ?? 10080,
    );
    const safeMinutes = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 10080;

    return safeMinutes * 60 * 1000;
  }

  private displayRoleName(roleName: string | null | undefined, roleCode: string): string {
    const trimmedRoleName = roleName?.trim();

    if (trimmedRoleName) {
      return trimmedRoleName;
    }

    return roleCode
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private async getInviterName(
    userId: string | null | undefined,
    fallback: string,
  ): Promise<string> {
    const trimmedUserId = userId?.trim();

    if (!trimmedUserId) {
      return fallback;
    }

    const result = await this.databaseService.query<{
      display_name: string | null;
      email: string | null;
    }>(
      `
        SELECT display_name, email
        FROM users
        WHERE id::text = $1
        LIMIT 1
      `,
      [trimmedUserId],
    );
    const row = result.rows[0];

    return row?.display_name?.trim() || row?.email?.trim() || fallback;
  }

  private getInvitationSupportNote(): string {
    return 'If you need help, contact your school administrator or MyShule support.';
  }

  private buildInvitationUrl(token: string, tenantId: string): string {
    const baseUrl = (
      this.configService.get<string>('email.publicAppUrl') ??
      'https://my-shule-erp.vercel.app'
    ).replace(/\/$/, '');

    const params = new URLSearchParams({
      token,
      tenant: tenantId,
    });

    return `${baseUrl}/invite/accept?${params.toString()}`;
  }
}
