import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { SUPERADMIN_ROLE_OWNER } from '../../auth/auth.constants';
import {
  AuthEmailService,
  EmailDeliveryError,
  type EmailDeliveryErrorCode,
} from '../../auth/auth-email.service';
import { AuthorizationRepository } from '../../auth/repositories/authorization.repository';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { DatabaseService } from '../../database/database.service';
import {
  DEFAULT_ONBOARDING_MODULE_CODES,
} from '../module-access/module-access.constants';
import { ModuleAccessService } from '../module-access/module-access.service';
import {
  AnonymizeTenantOffboardingDto,
  CreateSchoolDto,
  DeleteSchoolDto,
  PlatformEmailReadinessResponseDto,
  PlatformSchoolDeleteResponseDto,
  PlatformManualBillingState,
  SchoolOnboardingProfileDto,
  PlatformSchoolResponseDto,
  PlatformTenantProductSummaryDto,
  PlatformTenantAnonymizeResponseDto,
  PlatformTenantOffboardingManifestDto,
  PlatformSchoolUsageSummaryDto,
  UpdateSchoolBillingDto,
} from './dto/create-school.dto';

type TenantRow = {
  tenant_id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'inactive';
  created_at: Date | string;
  admin_email?: string | null;
  invitation_status?: 'pending' | 'processing' | 'sent' | 'failed' | null;
  invite_expires_at?: Date | string | null;
  last_error_code?: string | null;
  last_error_summary?: string | null;
  provider_status_code?: number | string | null;
  metadata?: Record<string, unknown> | string | null;
  subscription_status?: string | null;
  subscription_plan_code?: string | null;
  subscription_metadata?: Record<string, unknown> | string | null;
  subscription_grace_period_ends_at?: Date | string | null;
  subscription_restricted_at?: Date | string | null;
  subscription_suspended_at?: Date | string | null;
};

type PlatformTenantProductSummaryRow = {
  total_schools?: number | string | null;
  active_schools?: number | string | null;
  inactive_schools?: number | string | null;
  billing_active_schools?: number | string | null;
  billing_grace_period_schools?: number | string | null;
  billing_restricted_schools?: number | string | null;
  billing_suspended_schools?: number | string | null;
  pending_principal_invites?: number | string | null;
  failed_principal_invites?: number | string | null;
  expired_principal_invites?: number | string | null;
  schools_with_modules?: number | string | null;
  enabled_module_assignments?: number | string | null;
};

type InvitationDeliveryStatus = PlatformSchoolResponseDto['invitation_status'];

type InvitationDeliveryResult = {
  status: InvitationDeliveryStatus;
  message: string;
  failureCode?: string;
  failureReason?: string;
  actionRequired?: string;
  providerStatusCode?: number;
  canResendInvite: boolean;
};

type InvitationAction = {
  outboxId?: string;
  tenantId: string;
  schoolName: string;
  adminEmail: string;
  adminName: string;
  assignedRole: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date;
};

type InvitationContextRow = TenantRow & {
  invite_metadata?: Record<string, unknown> | string | null;
};

type AuditAction =
  | 'platform.school.deleted'
  | 'platform.school.deprovisioned'
  | 'platform.school.offboarding_exported'
  | 'platform.school.legal_offboarding_anonymized'
  | 'platform.school.billing_state_updated';

const manualBillingLabels: Record<PlatformManualBillingState, string> = {
  not_configured: 'Not configured',
  active: 'Active',
  grace_period: 'Grace period',
  restricted: 'Restricted',
  suspended: 'Suspended',
  expired: 'Expired',
};

@Injectable()
export class PlatformOnboardingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly emailService: AuthEmailService,
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
    @Optional() private readonly moduleAccessService?: ModuleAccessService,
  ) {}

  async listSchools(): Promise<PlatformSchoolResponseDto[]> {
    const result = await this.databaseService.query<TenantRow>(
      `
        SELECT
          tenants.tenant_id,
          tenants.name,
          tenants.subdomain,
          tenants.status,
          tenants.created_at,
          latest_email.recipient_email AS admin_email,
          latest_email.status AS invitation_status,
          latest_email.last_error_code,
          latest_email.last_error_summary,
          latest_email.provider_status_code,
          latest_token.expires_at AS invite_expires_at,
          current_subscription.status AS subscription_status,
          current_subscription.plan_code AS subscription_plan_code,
          current_subscription.metadata AS subscription_metadata,
          current_subscription.grace_period_ends_at AS subscription_grace_period_ends_at,
          current_subscription.restricted_at AS subscription_restricted_at,
          current_subscription.suspended_at AS subscription_suspended_at
        FROM tenants
        LEFT JOIN LATERAL (
          SELECT
            recipient_email,
            status,
            last_error_code,
            last_error_summary,
            provider_status_code
          FROM auth_email_outbox
          WHERE tenant_id = tenants.tenant_id
            AND template = 'school_invitation'
          ORDER BY created_at DESC
          LIMIT 1
        ) latest_email ON TRUE
        LEFT JOIN LATERAL (
          SELECT expires_at
          FROM auth_action_tokens
          WHERE tenant_id = tenants.tenant_id
            AND purpose = 'invite_acceptance'
          ORDER BY created_at DESC
          LIMIT 1
        ) latest_token ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            status,
            plan_code,
            metadata,
            grace_period_ends_at,
            restricted_at,
            suspended_at
          FROM subscriptions
          WHERE tenant_id = tenants.tenant_id
          ORDER BY
            CASE status
              WHEN 'active' THEN 1
              WHEN 'trialing' THEN 2
              WHEN 'past_due' THEN 3
              WHEN 'restricted' THEN 4
              WHEN 'suspended' THEN 5
              ELSE 6
            END ASC,
            created_at DESC
          LIMIT 1
        ) current_subscription ON TRUE
        ORDER BY tenants.created_at DESC, tenants.name ASC
      `,
    );

    const enabledModulesByTenantId = await this.getEnabledModulesByTenantId(
      result.rows.map((row) => row.tenant_id),
    );

    return result.rows.map((row) =>
      this.toPlatformSchoolResponse(row, this.deliveryResultForOutboxRow(row), {
        enabledModules: enabledModulesByTenantId.get(row.tenant_id) ?? [],
      }),
    );
  }

  async getProductTenantSummary(): Promise<PlatformTenantProductSummaryDto> {
    const result = await this.databaseService.query<PlatformTenantProductSummaryRow>(
      `
        WITH tenant_product AS (
          SELECT
            tenants.tenant_id,
            tenants.status,
            COALESCE(
              NULLIF(current_subscription.metadata ->> 'manual_billing_state', ''),
              CASE current_subscription.status
                WHEN 'active' THEN 'active'
                WHEN 'trialing' THEN 'active'
                WHEN 'past_due' THEN 'grace_period'
                WHEN 'restricted' THEN 'restricted'
                WHEN 'suspended' THEN 'suspended'
                WHEN 'expired' THEN 'expired'
                ELSE 'not_configured'
              END
            ) AS billing_state,
            latest_email.status AS invitation_delivery_status,
            latest_token.expires_at AS invite_expires_at,
            latest_token.consumed_at AS invite_consumed_at,
            COALESCE(module_counts.enabled_count, 0) AS enabled_module_count
          FROM tenants
          LEFT JOIN LATERAL (
            SELECT status
            FROM auth_email_outbox
            WHERE tenant_id = tenants.tenant_id
              AND template = 'school_invitation'
            ORDER BY created_at DESC
            LIMIT 1
          ) latest_email ON TRUE
          LEFT JOIN LATERAL (
            SELECT expires_at, consumed_at
            FROM auth_action_tokens
            WHERE tenant_id = tenants.tenant_id
              AND purpose = 'invite_acceptance'
            ORDER BY created_at DESC
            LIMIT 1
          ) latest_token ON TRUE
          LEFT JOIN LATERAL (
            SELECT status, metadata
            FROM subscriptions
            WHERE tenant_id = tenants.tenant_id
            ORDER BY
              CASE status
                WHEN 'active' THEN 1
                WHEN 'trialing' THEN 2
                WHEN 'past_due' THEN 3
                WHEN 'restricted' THEN 4
                WHEN 'suspended' THEN 5
                ELSE 6
              END ASC,
              created_at DESC
            LIMIT 1
          ) current_subscription ON TRUE
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS enabled_count
            FROM school_module_access
            WHERE tenant_id = tenants.tenant_id
              AND enabled = TRUE
          ) module_counts ON TRUE
        )
        SELECT
          COUNT(*)::int AS total_schools,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_schools,
          COUNT(*) FILTER (WHERE status <> 'active')::int AS inactive_schools,
          COUNT(*) FILTER (WHERE billing_state = 'active')::int AS billing_active_schools,
          COUNT(*) FILTER (WHERE billing_state = 'grace_period')::int AS billing_grace_period_schools,
          COUNT(*) FILTER (WHERE billing_state = 'restricted')::int AS billing_restricted_schools,
          COUNT(*) FILTER (WHERE billing_state = 'suspended')::int AS billing_suspended_schools,
          COUNT(*) FILTER (
            WHERE invite_consumed_at IS NULL
              AND invite_expires_at > NOW()
              AND COALESCE(invitation_delivery_status, 'pending') IN ('pending', 'processing', 'sent')
          )::int AS pending_principal_invites,
          COUNT(*) FILTER (WHERE invitation_delivery_status = 'failed')::int AS failed_principal_invites,
          COUNT(*) FILTER (
            WHERE invite_consumed_at IS NULL
              AND invite_expires_at <= NOW()
          )::int AS expired_principal_invites,
          COUNT(*) FILTER (WHERE enabled_module_count > 0)::int AS schools_with_modules,
          COALESCE(SUM(enabled_module_count), 0)::int AS enabled_module_assignments
        FROM tenant_product
      `,
    );
    const row = result.rows[0] ?? {};

    return {
      total_schools: this.toSummaryCount(row.total_schools),
      active_schools: this.toSummaryCount(row.active_schools),
      inactive_schools: this.toSummaryCount(row.inactive_schools),
      billing_active_schools: this.toSummaryCount(row.billing_active_schools),
      billing_grace_period_schools: this.toSummaryCount(row.billing_grace_period_schools),
      billing_restricted_schools: this.toSummaryCount(row.billing_restricted_schools),
      billing_suspended_schools: this.toSummaryCount(row.billing_suspended_schools),
      pending_principal_invites: this.toSummaryCount(row.pending_principal_invites),
      failed_principal_invites: this.toSummaryCount(row.failed_principal_invites),
      expired_principal_invites: this.toSummaryCount(row.expired_principal_invites),
      schools_with_modules: this.toSummaryCount(row.schools_with_modules),
      enabled_module_assignments: this.toSummaryCount(row.enabled_module_assignments),
      generated_at: new Date().toISOString(),
    };
  }

  async getEmailReadiness(): Promise<PlatformEmailReadinessResponseDto> {
    const configured = this.emailService.getTransactionalEmailStatus();
    const latestInvite = await this.databaseService.query<{
      status?: string | null;
      last_error_code?: string | null;
      last_error_summary?: string | null;
    }>(
      `
        SELECT status, last_error_code, last_error_summary
        FROM auth_email_outbox
        WHERE template = 'school_invitation'
        ORDER BY created_at DESC
        LIMIT 1
      `,
    );
    const latest = latestInvite.rows[0];
    const failureCode = latest?.last_error_code ?? undefined;
    const actionRequired = failureCode
      ? this.actionRequiredForFailureCode(failureCode)
      : undefined;

    return {
      provider: configured.provider,
      status: failureCode === 'resend_domain_not_verified' && !this.hasLikelyProductionSenderConfigured()
        ? 'blocked'
        : configured.status === 'missing'
          ? 'missing'
          : latest?.status === 'failed'
            ? 'degraded'
            : 'configured',
      api_key_configured: configured.api_key_configured,
      sender_configured: configured.sender_configured,
      public_app_url_configured: configured.public_app_url_configured,
      last_invite_status: latest?.status ?? undefined,
      last_failure_code: failureCode,
      last_failure_reason: latest?.last_error_summary ?? undefined,
      action_required: actionRequired,
    };
  }

  async createSchool(dto: CreateSchoolDto): Promise<PlatformSchoolResponseDto> {
    const tenantId = this.normalizeTenantId(dto.tenant_id);
    const schoolName = dto.school_name.trim();
    const adminEmail = dto.admin_email.trim().toLowerCase();
    const adminName = dto.admin_name.trim();
    const invitedByUserId = this.requestContext.getStore()?.user_id ?? null;

    if (!schoolName || !adminName) {
      throw new BadRequestException('School name and administrator name are required.');
    }

    const transactionResult = await this.databaseService.withRequestTransaction(async () => {
      const tenant = await this.createTenant({
        tenantId,
        schoolName,
        dto,
        invitedByUserId,
      });

      const emailConflict = await this.databaseService.query<{ tenant_id: string }>(
        `
          SELECT tm.tenant_id 
          FROM tenant_memberships tm
          INNER JOIN users u ON u.id = tm.user_id
          WHERE lower(u.email) = $1
          LIMIT 1
        `,
        [adminEmail]
      );
  
      if (emailConflict.rows.length > 0) {
        throw new BadRequestException('This email is already registered under another school. Use a different email address for this school.');
      }
  
      const invitationConflict = await this.databaseService.query<{ tenant_id: string }>(
        `
          SELECT tenant_id 
          FROM auth_action_tokens
          WHERE lower(email) = $1
            AND purpose = 'invite_acceptance'
            AND consumed_at IS NULL
          LIMIT 1
        `,
        [adminEmail]
      );
  
      if (invitationConflict.rows.length > 0) {
        throw new BadRequestException('This email is already registered under another school. Use a different email address for this school.');
      }

      await this.authorizationRepository.ensureTenantAuthorizationBaseline(tenantId);
      const enabledModules = await this.assignInitialModules({
        tenantId,
        moduleCodes: dto.module_codes,
        updatedBy: invitedByUserId,
      });

      const invitation = await this.prepareInvitationAction({
        tenantId,
        schoolName,
        adminEmail,
        adminName,
        invitedByUserId,
      });

      await this.persistTenantDomain({
        tenantId,
        domain: dto.domain,
        createdByUserId: invitedByUserId,
      });

      return { tenant, invitation, enabledModules };
    });

    const delivery = await this.deliverInvitation(transactionResult.invitation);

    return this.toPlatformSchoolResponse(transactionResult.tenant, delivery, {
      adminEmail,
      inviteExpiresAt: transactionResult.invitation.expiresAt,
      enabledModules: transactionResult.enabledModules,
    });
  }

  async resendSchoolAdminInvite(tenantIdInput: string): Promise<PlatformSchoolResponseDto> {
    const tenantId = this.normalizeTenantId(tenantIdInput);
    const invitedByUserId = this.requestContext.getStore()?.user_id ?? null;

    const transactionResult = await this.databaseService.withRequestTransaction(async () => {
      const context = await this.findInvitationContext(tenantId);
      const metadata = this.parseInviteMetadata(context.invite_metadata);
      const adminEmail = context.admin_email?.trim().toLowerCase();

      if (!adminEmail) {
        throw new BadRequestException('This school does not have an administrator invitation to resend.');
      }

      const adminName =
        typeof metadata.display_name === 'string' && metadata.display_name.trim()
          ? metadata.display_name.trim()
          : 'School administrator';
      const invitation = await this.prepareInvitationAction({
        tenantId: context.tenant_id,
        schoolName: context.name,
        adminEmail,
        adminName,
        invitedByUserId,
      });

      return {
        tenant: context,
        invitation,
        adminEmail,
      };
    });

    const delivery = await this.deliverInvitation(transactionResult.invitation);
    const enabledModules = await this.getEnabledModulesForTenant(tenantId);

    return this.toPlatformSchoolResponse(transactionResult.tenant, delivery, {
      adminEmail: transactionResult.adminEmail,
      inviteExpiresAt: transactionResult.invitation.expiresAt,
      enabledModules,
    });
  }

  async updateSchoolBilling(
    tenantIdInput: string,
    dto: UpdateSchoolBillingDto,
  ): Promise<PlatformSchoolResponseDto> {
    const tenantId = this.normalizeTenantId(tenantIdInput);
    const state = dto.state;
    const note = dto.note?.trim() || null;
    const effectiveUntil = this.parseEffectiveUntil(dto.effective_until);
    const actorUserId = this.requestContext.getStore()?.user_id ?? null;

    const tenant = await this.databaseService.withRequestTransaction(async () => {
      await this.scopeTenantForLifecycleMutation(tenantId);
      const existingTenant = await this.findPlatformSchoolRow(tenantId);
      await this.upsertManualBillingState({
        tenantId,
        state,
        note,
        effectiveUntil,
        actorUserId,
      });
      await this.writeSchoolLifecycleAudit(
        'platform.school.billing_state_updated',
        existingTenant,
        await this.getTenantUsageSummary(tenantId),
        `Billing state set to ${manualBillingLabels[state]}`,
      );

      return this.findPlatformSchoolRow(tenantId);
    });
    const enabledModules = await this.getEnabledModulesForTenant(tenantId);

    return this.toPlatformSchoolResponse(tenant, this.deliveryResultForOutboxRow(tenant), {
      enabledModules,
    });
  }

  async hardDeleteSchool(
    tenantIdInput: string,
    dto: DeleteSchoolDto,
  ): Promise<PlatformSchoolDeleteResponseDto> {
    const tenantId = this.normalizeTenantId(tenantIdInput);
    const confirmation = dto.confirmation.trim().toLowerCase();
    const reason = dto.reason.trim();

    if (confirmation !== tenantId) {
      throw new BadRequestException(`Type ${tenantId} to confirm school hard deletion.`);
    }

    if (reason.length < 3) {
      throw new BadRequestException('Enter a deletion reason for the audit trail.');
    }

    if (tenantId === 'global') {
      throw new BadRequestException('Cannot delete the global tenant.');
    }

    return this.databaseService.withRequestTransaction(async () => {
      await this.scopeTenantForLifecycleMutation(tenantId);
      const tenant = await this.findTenantForDelete(tenantId);
      const usageSummary = await this.getTenantUsageSummary(tenantId);

      await this.writeSchoolLifecycleAudit('platform.school.deleted', tenant, usageSummary, reason);
      await this.hardDeleteTenantDeep(tenantId);

      return {
        tenant_id: tenantId,
        deleted: true,
        deprovisioned: false,
        message: `${tenant.name} was permanently hard deleted and all operational records were purged.`,
        usage_summary: usageSummary,
      };
    });
  }

  async deleteSchool(
    tenantIdInput: string,
    dto: DeleteSchoolDto,
  ): Promise<PlatformSchoolDeleteResponseDto> {
    const tenantId = this.normalizeTenantId(tenantIdInput);
    const confirmation = dto.confirmation.trim().toLowerCase();
    const reason = dto.reason.trim();

    if (confirmation !== tenantId) {
      throw new BadRequestException(`Type ${tenantId} to confirm school deletion.`);
    }

    if (reason.length < 3) {
      throw new BadRequestException('Enter a deletion reason for the audit trail.');
    }

    return this.databaseService.withRequestTransaction(async () => {
      await this.scopeTenantForLifecycleMutation(tenantId);
      const tenant = await this.findTenantForDelete(tenantId);
      const usageSummary = await this.getTenantUsageSummary(tenantId);
      const hasOperationalRecords =
        usageSummary.students > 0 ||
        usageSummary.invoices > 0 ||
        usageSummary.support_tickets > 0 ||
        usageSummary.mpesa_transactions > 0;

      if (dto.hard_delete_empty_tenant && !hasOperationalRecords) {
        await this.writeSchoolLifecycleAudit('platform.school.deleted', tenant, usageSummary, reason);
        await this.deleteTenantShell(tenantId);

        return {
          tenant_id: tenantId,
          deleted: true,
          deprovisioned: false,
          message: `${tenant.name} was permanently deleted because it had no operational records.`,
          usage_summary: usageSummary,
        };
      }

      const updatedTenant = await this.deprovisionTenant(tenantId, reason);
      await this.writeSchoolLifecycleAudit(
        'platform.school.deprovisioned',
        updatedTenant,
        usageSummary,
        reason,
      );

      return {
        tenant_id: tenantId,
        deleted: false,
        deprovisioned: true,
        message: `${updatedTenant.name} has records, so it was deprovisioned instead of deleted.`,
        usage_summary: usageSummary,
        school: this.toPlatformSchoolResponse(updatedTenant, {
          status: 'blocked',
          message: 'School deprovisioned. Invites are disabled for this tenant.',
          canResendInvite: false,
        }),
      };
    });
  }

  async exportTenantOffboardingPackage(
    tenantIdInput: string,
  ): Promise<PlatformTenantOffboardingManifestDto> {
    const tenantId = this.normalizeTenantId(tenantIdInput);
    const tenant = await this.findTenantForDelete(tenantId);
    const usageSummary = await this.getTenantUsageSummary(tenantId);

    await this.writeSchoolLifecycleAudit(
      'platform.school.offboarding_exported',
      tenant,
      usageSummary,
      'contract offboarding export generated',
    );

    return {
      tenant_id: tenant.tenant_id,
      school_name: tenant.name,
      export_type: 'contract_offboarding',
      generated_at: new Date().toISOString(),
      usage_summary: usageSummary,
      tables: [
        { name: 'tenants', category: 'school profile', retention: 'export then retain shell audit' },
        { name: 'tenant_memberships', category: 'users and roles', retention: 'export active and historical membership state' },
        { name: 'students', category: 'child data', retention: 'export only to verified school owner or legal delegate' },
        { name: 'invoices', category: 'finance records', retention: 'retain for finance/legal policy' },
        { name: 'mpesa_transactions', category: 'payment records', retention: 'retain verified settlement evidence' },
        { name: 'student_report_cards', category: 'academic records', retention: 'immutable academic record policy' },
        { name: 'audit_logs', category: 'security evidence', retention: 'retain per compliance policy' },
      ],
      retention_policy: {
        payment_records: 'keep as required by finance and legal policy',
        audit_logs: 'keep per compliance policy',
        health_discipline_notes: 'keep with strict school policy and legal review',
        raw_provider_payloads: 'expire encrypted raw payloads after operational review window',
        report_card_artifacts: 'immutable academic record policy',
      },
    };
  }

  async anonymizeTenantForLegalOffboarding(
    tenantIdInput: string,
    dto: AnonymizeTenantOffboardingDto,
  ): Promise<PlatformTenantAnonymizeResponseDto> {
    const tenantId = this.normalizeTenantId(tenantIdInput);
    const confirmation = dto.confirmation.trim().toLowerCase();
    const reason = dto.reason.trim();

    if (confirmation !== tenantId) {
      throw new BadRequestException(`Type ${tenantId} to confirm school anonymization.`);
    }

    if (reason.length < 3) {
      throw new BadRequestException('Enter an anonymization reason for the audit trail.');
    }

    return this.databaseService.withRequestTransaction(async () => {
      await this.scopeTenantForLifecycleMutation(tenantId);
      const tenant = await this.findTenantForDelete(tenantId);
      const usageSummary = await this.getTenantUsageSummary(tenantId);
      const anonymizedTenant = await this.anonymizeTenantShell(tenantId, reason);

      await this.writeSchoolLifecycleAudit(
        'platform.school.legal_offboarding_anonymized',
        anonymizedTenant,
        usageSummary,
        reason,
      );

      return {
        tenant_id: tenant.tenant_id,
        anonymized: true,
        message: `${tenant.name} was anonymized for legal offboarding.`,
        usage_summary: usageSummary,
        school: this.toPlatformSchoolResponse(anonymizedTenant, {
          status: 'blocked',
          message: 'School anonymized. Invites are disabled for this tenant.',
          canResendInvite: false,
        }),
      };
    });
  }

  private async createTenant(input: {
    tenantId: string;
    schoolName: string;
    dto: CreateSchoolDto;
    invitedByUserId: string | null;
  }): Promise<TenantRow> {
    const onboardingProfile = this.buildBlueprintOnboardingProfile(input.dto);
    const result = await this.databaseService.query<TenantRow>(
      `
        INSERT INTO tenants (tenant_id, name, subdomain, status, settings, metadata)
        VALUES ($1, $2, $3, 'active', $4::jsonb, $5::jsonb)
        ON CONFLICT (tenant_id) DO NOTHING
        RETURNING tenant_id, name, subdomain, status, metadata, created_at
      `,
      [
        input.tenantId,
        input.schoolName,
        input.tenantId,
        JSON.stringify({
          curriculum: onboardingProfile.curriculum ?? null,
          institution_category: onboardingProfile.institution_category ?? null,
          sms_sender_id: onboardingProfile.sms_sender_id ?? null,
          domain: onboardingProfile.domain ?? null,
          onboarding_status: onboardingProfile.onboarding_steps.go_live,
        }),
        JSON.stringify({
          ...onboardingProfile,
          onboarded_by_user_id: input.invitedByUserId,
          onboarding_source: SUPERADMIN_ROLE_OWNER,
        }),
      ],
    );

    const tenant = result.rows[0];
    if (!tenant) {
      throw new ConflictException('A school workspace with this code already exists.');
    }

    return tenant;
  }

  private async persistTenantDomain(input: {
    tenantId: string;
    domain: string | undefined;
    createdByUserId: string | null;
  }): Promise<void> {
    const domain = input.domain?.trim().toLowerCase();
    if (!domain) {
      return;
    }

    await this.databaseService.query(
      `
        INSERT INTO tenant_domains (tenant_id, domain, domain_type, status, created_by_user_id, metadata)
        VALUES ($1, $2, 'custom', 'pending_verification', $3, $4::jsonb)
        ON CONFLICT (tenant_id, domain) DO UPDATE
        SET status = EXCLUDED.status,
            created_by_user_id = EXCLUDED.created_by_user_id,
            metadata = tenant_domains.metadata || EXCLUDED.metadata,
            updated_at = NOW()
      `,
      [
        input.tenantId,
        domain,
        input.createdByUserId,
        JSON.stringify({
          source: 'platform_onboarding',
          go_live_dependency: true,
        }),
      ],
    );
  }

  private async findInvitationContext(tenantId: string): Promise<InvitationContextRow> {
    const result = await this.databaseService.query<InvitationContextRow>(
      `
        SELECT
          tenants.tenant_id,
          tenants.name,
          tenants.subdomain,
          tenants.status,
          tenants.created_at,
          latest_token.email AS admin_email,
          latest_token.metadata AS invite_metadata
        FROM tenants
        LEFT JOIN LATERAL (
          SELECT email, metadata
          FROM auth_action_tokens
          WHERE tenant_id = tenants.tenant_id
            AND purpose = 'invite_acceptance'
          ORDER BY created_at DESC
          LIMIT 1
        ) latest_token ON TRUE
        WHERE tenants.tenant_id = $1
        LIMIT 1
      `,
      [tenantId],
    );

    const context = result.rows[0];
    if (!context) {
      throw new NotFoundException('School workspace was not found.');
    }

    return context;
  }

  private async findPlatformSchoolRow(tenantId: string): Promise<TenantRow> {
    const result = await this.databaseService.query<TenantRow>(
      `
        SELECT
          tenants.tenant_id,
          tenants.name,
          tenants.subdomain,
          tenants.status,
          tenants.created_at,
          tenants.metadata,
          latest_email.recipient_email AS admin_email,
          latest_email.status AS invitation_status,
          latest_email.last_error_code,
          latest_email.last_error_summary,
          latest_email.provider_status_code,
          latest_token.expires_at AS invite_expires_at,
          current_subscription.status AS subscription_status,
          current_subscription.plan_code AS subscription_plan_code,
          current_subscription.metadata AS subscription_metadata,
          current_subscription.grace_period_ends_at AS subscription_grace_period_ends_at,
          current_subscription.restricted_at AS subscription_restricted_at,
          current_subscription.suspended_at AS subscription_suspended_at
        FROM tenants
        LEFT JOIN LATERAL (
          SELECT
            recipient_email,
            status,
            last_error_code,
            last_error_summary,
            provider_status_code
          FROM auth_email_outbox
          WHERE tenant_id = tenants.tenant_id
            AND template = 'school_invitation'
          ORDER BY created_at DESC
          LIMIT 1
        ) latest_email ON TRUE
        LEFT JOIN LATERAL (
          SELECT expires_at
          FROM auth_action_tokens
          WHERE tenant_id = tenants.tenant_id
            AND purpose = 'invite_acceptance'
          ORDER BY created_at DESC
          LIMIT 1
        ) latest_token ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            status,
            plan_code,
            metadata,
            grace_period_ends_at,
            restricted_at,
            suspended_at
          FROM subscriptions
          WHERE tenant_id = tenants.tenant_id
          ORDER BY
            CASE status
              WHEN 'active' THEN 1
              WHEN 'trialing' THEN 2
              WHEN 'past_due' THEN 3
              WHEN 'restricted' THEN 4
              WHEN 'suspended' THEN 5
              ELSE 6
            END ASC,
            created_at DESC
          LIMIT 1
        ) current_subscription ON TRUE
        WHERE tenants.tenant_id = $1
        LIMIT 1
      `,
      [tenantId],
    );
    const tenant = result.rows[0];

    if (!tenant) {
      throw new NotFoundException('School workspace was not found.');
    }

    return tenant;
  }

  private async findTenantForDelete(tenantId: string): Promise<TenantRow> {
    const result = await this.databaseService.query<TenantRow>(
      `
        SELECT tenant_id, name, subdomain, status, created_at
        FROM tenants
        WHERE tenant_id = $1
        LIMIT 1
      `,
      [tenantId],
    );
    const tenant = result.rows[0];

    if (!tenant) {
      throw new NotFoundException('School workspace was not found.');
    }

    return tenant;
  }

  private async scopeTenantForLifecycleMutation(tenantId: string): Promise<void> {
    await this.databaseService.query(
      "SELECT set_config('app.tenant_id', $1, true)",
      [tenantId],
    );
  }

  private async getTenantUsageSummary(
    tenantId: string,
  ): Promise<PlatformSchoolUsageSummaryDto> {
    const result = await this.databaseService.query<{
      memberships: string | number;
      students: string | number;
      invoices: string | number;
      support_tickets: string | number;
      mpesa_transactions: string | number;
    }>(
      `
        SELECT
          (SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id = $1) AS memberships,
          (SELECT COUNT(*) FROM students WHERE tenant_id = $1) AS students,
          (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1) AS invoices,
          (SELECT COUNT(*) FROM support_tickets WHERE tenant_id = $1) AS support_tickets,
          (SELECT COUNT(*) FROM mpesa_transactions WHERE tenant_id = $1) AS mpesa_transactions
      `,
      [tenantId],
    );
    const row = result.rows[0];

    return {
      memberships: this.toCount(row?.memberships),
      students: this.toCount(row?.students),
      invoices: this.toCount(row?.invoices),
      support_tickets: this.toCount(row?.support_tickets),
      mpesa_transactions: this.toCount(row?.mpesa_transactions),
    };
  }

  private async upsertManualBillingState(input: {
    tenantId: string;
    state: Exclude<PlatformManualBillingState, 'not_configured'>;
    note: string | null;
    effectiveUntil: Date | null;
    actorUserId: string | null;
  }): Promise<void> {
    const now = new Date();
    const subscriptionStatus = this.subscriptionStatusForManualBillingState(input.state);
    const lifecycleDates = this.lifecycleDatesForManualBillingState(input.state, now, input.effectiveUntil);
    const metadata = {
      billing_control: 'manual_superadmin',
      manual_billing_state: input.state,
      manual_billing_label: manualBillingLabels[input.state],
      manual_billing_note: input.note,
      manual_billing_configured_at: now.toISOString(),
      manual_billing_configured_by_user_id: input.actorUserId,
      manual_billing_effective_until: input.effectiveUntil?.toISOString() ?? null,
    };

    const subscriptionValues = [
      input.tenantId,
      'enterprise',
      subscriptionStatus,
      JSON.stringify(['*']),
      JSON.stringify({}),
      lifecycleDates.currentPeriodStart.toISOString(),
      lifecycleDates.currentPeriodEnd.toISOString(),
      lifecycleDates.gracePeriodEndsAt?.toISOString() ?? null,
      lifecycleDates.restrictedAt?.toISOString() ?? null,
      lifecycleDates.suspendedAt?.toISOString() ?? null,
      lifecycleDates.suspensionReason,
      lifecycleDates.activatedAt?.toISOString() ?? null,
      lifecycleDates.canceledAt?.toISOString() ?? null,
      JSON.stringify(metadata),
    ];

    // Serialize manual saves per tenant without depending on a production-only conflict index.
    await this.databaseService.query(
      'SELECT pg_advisory_xact_lock(hashtext($1::text), 702101)',
      [input.tenantId],
    );

    const updateResult = await this.databaseService.query(
      `
        UPDATE subscriptions
        SET
          plan_code = $2,
          status = $3,
          billing_phone_number = NULL,
          currency_code = 'KES',
          features = $4::jsonb,
          limits = $5::jsonb,
          seats_allocated = 1,
          current_period_start = $6::timestamptz,
          current_period_end = $7::timestamptz,
          trial_ends_at = NULL,
          grace_period_ends_at = $8::timestamptz,
          restricted_at = $9::timestamptz,
          suspended_at = $10::timestamptz,
          suspension_reason = $11,
          activated_at = $12::timestamptz,
          canceled_at = $13::timestamptz,
          metadata = COALESCE(metadata, '{}'::jsonb) || $14::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND status IN ('trialing', 'active', 'past_due', 'restricted', 'suspended')
      `,
      subscriptionValues,
    );

    if ((updateResult.rowCount ?? 0) > 0) {
      return;
    }

    await this.databaseService.query(
      `
        INSERT INTO subscriptions (
          tenant_id,
          plan_code,
          status,
          billing_phone_number,
          currency_code,
          features,
          limits,
          seats_allocated,
          current_period_start,
          current_period_end,
          trial_ends_at,
          grace_period_ends_at,
          restricted_at,
          suspended_at,
          suspension_reason,
          activated_at,
          canceled_at,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          NULL,
          'KES',
          $4::jsonb,
          $5::jsonb,
          1,
          $6::timestamptz,
          $7::timestamptz,
          NULL,
          $8::timestamptz,
          $9::timestamptz,
          $10::timestamptz,
          $11,
          $12::timestamptz,
          $13::timestamptz,
          $14::jsonb
        )
      `,
      subscriptionValues,
    );
  }

  private subscriptionStatusForManualBillingState(
    state: Exclude<PlatformManualBillingState, 'not_configured'>,
  ): 'active' | 'past_due' | 'restricted' | 'suspended' | 'expired' {
    if (state === 'grace_period') {
      return 'past_due';
    }

    return state === 'expired' ? 'expired' : state;
  }

  private lifecycleDatesForManualBillingState(
    state: Exclude<PlatformManualBillingState, 'not_configured'>,
    now: Date,
    effectiveUntil: Date | null,
  ): {
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    gracePeriodEndsAt: Date | null;
    restrictedAt: Date | null;
    suspendedAt: Date | null;
    suspensionReason: string | null;
    activatedAt: Date | null;
    canceledAt: Date | null;
  } {
    const longRunningEnd = effectiveUntil ?? new Date(Date.UTC(now.getUTCFullYear() + 10, now.getUTCMonth(), now.getUTCDate()));
    const periodEnd = state === 'grace_period'
      ? now
      : longRunningEnd;

    return {
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      gracePeriodEndsAt: state === 'grace_period' ? effectiveUntil : null,
      restrictedAt: state === 'restricted' ? now : null,
      suspendedAt: state === 'suspended' || state === 'expired' ? now : null,
      suspensionReason: state === 'active' ? null : `manual_${state}`,
      activatedAt: ['active', 'grace_period', 'restricted'].includes(state) ? now : null,
      canceledAt: state === 'expired' ? now : null,
    };
  }

  private async hardDeleteTenantDeep(tenantId: string): Promise<void> {
    // Dynamically delete from all tables with a tenant_id
    const allTablesQuery = await this.databaseService.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'tenant_id' AND table_schema = 'public'
    `);
    
    const tablesToProcess = allTablesQuery.rows
      .map((r) => r.table_name)
      .filter((t) => t !== 'tenants');

    let maxRetries = tablesToProcess.length * 3;
    while (tablesToProcess.length > 0 && maxRetries > 0) {
      maxRetries--;
      const table = tablesToProcess.shift()!;
      try {
        await this.databaseService.query(`SAVEPOINT delete_table_${table}`);
        await this.databaseService.query(`DELETE FROM "${table}" WHERE tenant_id = $1`, [tenantId]);
        await this.databaseService.query(`RELEASE SAVEPOINT delete_table_${table}`);
      } catch (error: any) {
        await this.databaseService.query(`ROLLBACK TO SAVEPOINT delete_table_${table}`);
        if (error.code === '23503') {
          // Foreign key violation, push it back to the end of the queue
          tablesToProcess.push(table);
        } else {
          throw error;
        }
      }
    }

    if (tablesToProcess.length > 0) {
      console.warn(`Could not delete some tables due to cyclic dependencies: ${tablesToProcess.join(', ')}`);
    }

    // Clean up user accounts that belong ONLY to this tenant
    const tenantUsersRes = await this.databaseService.query<{ id: string }>('SELECT id FROM users WHERE tenant_id = $1', [tenantId]);
    for (const userRow of tenantUsersRes.rows) {
      const otherMemberships = await this.databaseService.query<{ count: string }>('SELECT count(*) as count FROM tenant_memberships WHERE user_id = $1 AND tenant_id != $2', [userRow.id, tenantId]);
      if (parseInt(otherMemberships.rows[0].count, 10) === 0) {
        await this.databaseService.query('DELETE FROM users WHERE id = $1', [userRow.id]);
      } else {
        await this.databaseService.query('DELETE FROM tenant_memberships WHERE user_id = $1 AND tenant_id = $2', [userRow.id, tenantId]);
      }
    }

    // Finally delete the tenant shell
    await this.databaseService.query('DELETE FROM tenants WHERE tenant_id = $1', [tenantId]);
  }

  private async deleteTenantShell(tenantId: string): Promise<void> {
    const cleanupStatements = [
      'DELETE FROM module_usage_events WHERE tenant_id = $1',
      'DELETE FROM school_module_access WHERE tenant_id = $1',
      'DELETE FROM usage_records WHERE tenant_id = $1',
      'DELETE FROM billing_notifications WHERE tenant_id = $1',
      'DELETE FROM invoices WHERE tenant_id = $1',
      'DELETE FROM subscriptions WHERE tenant_id = $1',
      'DELETE FROM auth_email_outbox WHERE tenant_id = $1',
      'DELETE FROM auth_action_tokens WHERE tenant_id = $1',
      'DELETE FROM auth_mfa_challenges WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)',
      'DELETE FROM auth_trusted_devices WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)',
      'DELETE FROM sms_purchase_requests WHERE tenant_id = $1',
      'DELETE FROM sms_wallet_transactions WHERE tenant_id = $1',
      'DELETE FROM sms_logs WHERE tenant_id = $1',
      'DELETE FROM school_sms_wallets WHERE tenant_id = $1',
      'DELETE FROM school_integrations WHERE tenant_id = $1',
      'DELETE FROM integration_logs WHERE tenant_id = $1',
      'DELETE FROM tenant_payment_channels WHERE tenant_id = $1',
      'DELETE FROM tenant_bank_accounts WHERE tenant_id = $1',
      'DELETE FROM tenant_mpesa_configs WHERE tenant_id = $1',
      'DELETE FROM tenant_financial_accounts WHERE tenant_id = $1',
      'DELETE FROM tenant_domains WHERE tenant_id = $1',
      'DELETE FROM tenant_memberships WHERE tenant_id = $1',
      'DELETE FROM users WHERE tenant_id = $1',
      'DELETE FROM role_permissions WHERE tenant_id = $1',
      'DELETE FROM roles WHERE tenant_id = $1',
      'DELETE FROM permissions WHERE tenant_id = $1',
      'DELETE FROM tenants WHERE tenant_id = $1',
    ];

    for (const statement of cleanupStatements) {
      await this.databaseService.query(statement, [tenantId]);
    }
  }

  private async deprovisionTenant(tenantId: string, reason: string): Promise<TenantRow> {
    const result = await this.databaseService.query<TenantRow>(
      `
        UPDATE tenants
        SET
          status = 'inactive',
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING tenant_id, name, subdomain, status, created_at
      `,
      [
        tenantId,
        JSON.stringify({
          deprovisioned_at: new Date().toISOString(),
          deprovision_reason: reason,
        }),
      ],
    );

    return result.rows[0] ?? (await this.findTenantForDelete(tenantId));
  }

  private async anonymizeTenantShell(tenantId: string, reason: string): Promise<TenantRow> {
    const anonymizedName = `Anonymized School ${tenantId}`;
    const result = await this.databaseService.query<TenantRow>(
      `
        UPDATE tenants
        SET
          name = $2,
          status = 'inactive',
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING tenant_id, name, subdomain, status, created_at
      `,
      [
        tenantId,
        anonymizedName,
        JSON.stringify({
          legal_offboarding_anonymized_at: new Date().toISOString(),
          legal_offboarding_reason: reason,
        }),
      ],
    );

    return result.rows[0] ?? (await this.findTenantForDelete(tenantId));
  }

  private async writeSchoolLifecycleAudit(
    action: AuditAction,
    tenant: TenantRow,
    usageSummary: PlatformSchoolUsageSummaryDto,
    reason: string,
  ): Promise<void> {
    const context = this.requestContext.getStore();

    await this.databaseService.query(
      `
        INSERT INTO audit_logs (
          tenant_id,
          actor_user_id,
          request_id,
          action,
          resource_type,
          resource_id,
          ip_address,
          user_agent,
          metadata
        )
        VALUES ($1, NULL, $2, $3, 'tenant', NULL, NULL, $4, $5::jsonb)
      `,
      [
        tenant.tenant_id,
        context?.request_id ?? null,
        action,
        context?.user_agent ?? null,
        JSON.stringify({
          tenant_id: tenant.tenant_id,
          school_name: tenant.name,
          actor_user_id: context?.user_id ?? null,
          client_ip: context?.client_ip ?? null,
          reason,
          usage_summary: usageSummary,
        }),
      ],
    );
  }

  private async prepareInvitationAction(input: {
    tenantId: string;
    schoolName: string;
    adminEmail: string;
    adminName: string;
    invitedByUserId: string | null;
  }): Promise<InvitationAction> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.getInvitationTtlMs());
    const inviteUrl = this.buildInvitationUrl(token, input.tenantId);
    const assignedRole = 'School Principal/Admin';
    const inviterName = await this.getInviterName(input.invitedByUserId, 'MyShule Super Admin');
    const payload = {
      tenant_id: input.tenantId,
      tenant_name: input.schoolName,
      role_code: 'owner',
      role_name: assignedRole,
      display_name: input.adminName,
      invited_by_user_id: input.invitedByUserId,
      invited_by_display_name: inviterName,
      purpose: 'school_admin_invitation',
      expires_at: expiresAt.toISOString(),
    };

    const outboxId = await this.createInvitationAction({
      tenantId: input.tenantId,
      adminEmail: input.adminEmail,
      tokenHash,
      expiresAt,
      payload,
    });

    return {
      outboxId,
      tenantId: input.tenantId,
      schoolName: input.schoolName,
      adminEmail: input.adminEmail,
      adminName: input.adminName,
      assignedRole,
      inviterName,
      inviteUrl,
      expiresAt,
    };
  }

  private async createInvitationAction(input: {
    tenantId: string;
    adminEmail: string;
    tokenHash: string;
    expiresAt: Date;
    payload: Record<string, unknown>;
  }): Promise<string | undefined> {
    await this.databaseService.query(
      `
        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE tenant_id = $1
          AND lower(email) = lower($2)
          AND purpose = 'invite_acceptance'
          AND consumed_at IS NULL
      `,
      [input.tenantId, input.adminEmail],
    );

    await this.databaseService.query(
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
        input.adminEmail,
        input.tokenHash,
        input.expiresAt,
        JSON.stringify(input.payload),
      ],
    );

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
        VALUES ($1, NULL, $2, 'school_invitation', $3, $4::jsonb, 'pending')
        RETURNING id
      `,
      [
        input.tenantId,
        input.adminEmail,
        'You have been invited to My Shule ERP',
        JSON.stringify(input.payload),
      ],
    );

    return outboxResult.rows[0]?.id;
  }

  private async deliverInvitation(input: InvitationAction): Promise<InvitationDeliveryResult> {
    try {
      this.emailService.assertTransactionalEmailConfigured(
        'Transactional email is not configured for school invitations.',
      );

      await this.withDeliveryTimeout(
        this.emailService.sendInvitationEmail({
          to: input.adminEmail,
          displayName: input.adminName,
          schoolName: input.schoolName,
          assignedRole: input.assignedRole,
          inviterName: input.inviterName,
          inviteUrl: input.inviteUrl,
          expiresAt: input.expiresAt,
          supportNote: 'Contact your school administrator or MyShule support if this invitation looks wrong.',
        }),
      );
      await this.markOutboxDelivery(input.outboxId, 'sent');

      return {
        status: 'sent',
        message: `School created. Invitation sent to ${input.adminEmail}.`,
        canResendInvite: false,
      };
    } catch (error) {
      const failure = this.invitationFailureFromError(error);
      await this.markOutboxDelivery(input.outboxId, 'failed', {
        errorCode: failure.failureCode,
        errorSummary: failure.failureReason,
        providerStatusCode: failure.providerStatusCode,
      }).catch(() => undefined);

      return failure;
    }
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
  }

  private toPlatformSchoolResponse(
    tenant: TenantRow,
    delivery: InvitationDeliveryResult,
    override?: {
      adminEmail?: string;
      inviteExpiresAt?: Date | string | null;
      enabledModules?: string[];
    },
  ): PlatformSchoolResponseDto {
    const inviteExpiresAt =
      override?.inviteExpiresAt ?? tenant.invite_expires_at ?? null;

    return {
      tenant_id: tenant.tenant_id,
      school_name: tenant.name,
      subdomain: tenant.subdomain,
      status: tenant.status,
      invitation_sent: delivery.status === 'sent',
      invitation_status: delivery.status,
      invitation_message: delivery.message,
      invitation_failure_code: delivery.failureCode,
      invitation_failure_reason: delivery.failureReason,
      invitation_action_required: delivery.actionRequired,
      can_resend_invite: delivery.canResendInvite,
      invite_expires_at: inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : '',
      admin_email: override?.adminEmail ?? tenant.admin_email ?? '',
      created_at: new Date(tenant.created_at).toISOString(),
      enabled_modules: override?.enabledModules ?? [],
      billing: this.buildPlatformSchoolBilling(tenant),
      onboarding_profile: this.extractBlueprintOnboardingProfile(tenant.metadata),
    };
  }

  private toSummaryCount(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private buildPlatformSchoolBilling(
    tenant: TenantRow,
  ): PlatformSchoolResponseDto['billing'] {
    const metadata = this.parseJsonObject(tenant.subscription_metadata);
    const manualState = metadata?.manual_billing_state;
    const state: PlatformManualBillingState =
      typeof manualState === 'string' && manualState in manualBillingLabels
        ? manualState as PlatformManualBillingState
        : tenant.subscription_status
          ? this.manualBillingStateForSubscriptionStatus(tenant.subscription_status)
          : 'not_configured';

    return {
      state,
      label: manualBillingLabels[state],
      access_mode: this.accessModeForManualBillingState(state),
      plan_code: tenant.subscription_plan_code ?? null,
      effective_until:
        typeof metadata?.manual_billing_effective_until === 'string'
          ? metadata.manual_billing_effective_until
          : this.billingDateForState(tenant, state),
      configured_at:
        typeof metadata?.manual_billing_configured_at === 'string'
          ? metadata.manual_billing_configured_at
          : null,
      configured_by_user_id:
        typeof metadata?.manual_billing_configured_by_user_id === 'string'
          ? metadata.manual_billing_configured_by_user_id
          : null,
      note:
        typeof metadata?.manual_billing_note === 'string'
          ? metadata.manual_billing_note
          : null,
    };
  }

  private manualBillingStateForSubscriptionStatus(status: string): PlatformManualBillingState {
    if (status === 'active' || status === 'trialing') {
      return 'active';
    }

    if (status === 'past_due') {
      return 'grace_period';
    }

    if (status === 'restricted' || status === 'suspended' || status === 'expired') {
      return status;
    }

    return 'not_configured';
  }

  private accessModeForManualBillingState(
    state: PlatformManualBillingState,
  ): 'full' | 'read_only' | 'billing_only' | null {
    if (state === 'active' || state === 'grace_period') {
      return 'full';
    }

    if (state === 'restricted') {
      return 'read_only';
    }

    if (state === 'suspended' || state === 'expired') {
      return 'billing_only';
    }

    return null;
  }

  private billingDateForState(
    tenant: TenantRow,
    state: PlatformManualBillingState,
  ): string | null {
    const dateValue =
      state === 'grace_period'
        ? tenant.subscription_grace_period_ends_at
        : state === 'restricted'
          ? tenant.subscription_restricted_at
          : state === 'suspended' || state === 'expired'
            ? tenant.subscription_suspended_at
            : null;

    return dateValue ? new Date(dateValue).toISOString() : null;
  }

  private buildBlueprintOnboardingProfile(dto: CreateSchoolDto): SchoolOnboardingProfileDto {
    const campuses = this.normalizeCampuses(dto.campuses);
    const importPlan = this.normalizeStringArray(dto.import_plan);
    const serviceActivation = this.normalizeStringArray(dto.service_activation);
    const feeCategories = this.normalizeStringArray(dto.fee_categories);
    const hasStructure = campuses.length > 0
      || feeCategories.length > 0
      || Object.keys(dto.academic_calendar ?? {}).length > 0;

    return {
      registration_number: this.optionalTrim(dto.registration_number),
      knec_code: this.optionalTrim(dto.knec_code),
      county: this.optionalTrim(dto.county),
      location: this.optionalTrim(dto.location),
      contacts: this.normalizeStringRecord(dto.contacts),
      curriculum: dto.curriculum,
      institution_category: dto.institution_category,
      campuses,
      academic_calendar: dto.academic_calendar,
      fee_categories: feeCategories,
      sms_sender_id: this.optionalTrim(dto.sms_sender_id),
      domain: this.optionalTrim(dto.domain)?.toLowerCase(),
      quotas: dto.quotas,
      import_plan: importPlan,
      service_activation: serviceActivation,
      training_status: dto.training_status ?? 'pending',
      audit_verification_status: dto.audit_verification_status ?? 'pending',
      onboarding_steps: {
        create_school: 'complete',
        select_modules: 'complete',
        configure_structure: hasStructure ? 'complete' : 'pending',
        import_data: importPlan.length > 0 ? 'planned' : 'pending',
        activate_services: serviceActivation.length > 0 ? 'planned' : 'pending',
        go_live: 'blocked',
      },
    };
  }

  private extractBlueprintOnboardingProfile(
    value: TenantRow['metadata'],
  ): SchoolOnboardingProfileDto | undefined {
    const metadata = this.parseJsonObject(value);
    if (!metadata || !('onboarding_steps' in metadata)) {
      return undefined;
    }

    return metadata as unknown as SchoolOnboardingProfileDto;
  }

  private parseJsonObject(value: Record<string, unknown> | string | null | undefined): Record<string, unknown> | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? parsed as Record<string, unknown>
          : undefined;
      } catch {
        return undefined;
      }
    }

    return value;
  }

  private normalizeCampuses(value: CreateSchoolDto['campuses']): Array<{ name: string; code: string }> {
    return (value ?? [])
      .map((campus) => ({
        name: this.optionalTrim(campus.name) ?? '',
        code: (this.optionalTrim(campus.code) ?? '').toUpperCase(),
      }))
      .filter((campus) => campus.name && campus.code);
  }

  private normalizeStringArray(value: string[] | undefined): string[] {
    return (value ?? [])
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeStringRecord(value: Record<string, string> | undefined): Record<string, string> | undefined {
    if (!value) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key.trim(), item.trim()])
        .filter(([key, item]) => key && item),
    );
  }

  private optionalTrim(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private parseEffectiveUntil(value: string | undefined): Date | null {
    const trimmed = value?.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Use a valid billing effective-until date.');
    }

    return parsed;
  }

  private async assignInitialModules(input: {
    tenantId: string;
    moduleCodes: string[] | undefined;
    updatedBy: string | null;
  }): Promise<string[]> {
    if (!this.moduleAccessService) {
      return input.moduleCodes?.length
        ? [...input.moduleCodes]
        : [...DEFAULT_ONBOARDING_MODULE_CODES];
    }

    const moduleCodes = input.moduleCodes?.length
      ? input.moduleCodes
      : [...DEFAULT_ONBOARDING_MODULE_CODES];

    await this.moduleAccessService.setSchoolModuleCodes({
      tenantId: input.tenantId,
      moduleCodes,
      updatedBy: input.updatedBy,
    });

    return moduleCodes;
  }

  private async getEnabledModulesForTenant(tenantId: string): Promise<string[]> {
    if (!this.moduleAccessService) {
      return [];
    }

    return this.moduleAccessService.listEnabledModulesForTenant(tenantId);
  }

  private async getEnabledModulesByTenantId(tenantIds: string[]): Promise<Map<string, string[]>> {
    const enabledModulesByTenantId = new Map<string, string[]>();

    if (!this.moduleAccessService || tenantIds.length === 0) {
      return enabledModulesByTenantId;
    }

    const uniqueTenantIds = Array.from(new Set(tenantIds));
    const rows = await Promise.all(
      uniqueTenantIds.map(async (tenantId) => [
        tenantId,
        await this.moduleAccessService!.listEnabledModulesForTenant(tenantId),
      ] as const),
    );

    for (const [tenantId, moduleCodes] of rows) {
      enabledModulesByTenantId.set(tenantId, moduleCodes);
    }

    return enabledModulesByTenantId;
  }

  private deliveryResultForOutboxRow(row: TenantRow): InvitationDeliveryResult {
    const failureCode = row.last_error_code ?? undefined;
    const failureReason = row.last_error_summary ?? undefined;

    if (row.invitation_status === 'sent') {
      return {
        status: 'sent',
        message: this.invitationMessageForStatus('sent'),
        canResendInvite: false,
      };
    }

    if (failureCode) {
      const isBlocked = this.isPersistedInviteFailureStillBlocked(failureCode);
      const status: InvitationDeliveryStatus = isBlocked ? 'blocked' : 'failed';

      return {
        status,
        message: this.invitationMessageForStatus(status),
        failureCode,
        failureReason,
        actionRequired: this.actionRequiredForFailureCode(failureCode),
        providerStatusCode: this.toOptionalCount(row.provider_status_code),
        canResendInvite: !isBlocked,
      };
    }

    if (row.invitation_status === 'failed') {
      return {
        status: 'failed',
        message: this.invitationMessageForStatus('failed'),
        canResendInvite: true,
      };
    }

    return {
      status: 'queued',
      message: this.invitationMessageForStatus('queued'),
      canResendInvite: true,
    };
  }

  private invitationFailureFromError(error: unknown): InvitationDeliveryResult {
    if (error instanceof EmailDeliveryError) {
      const status = this.statusForEmailDeliveryError(error.code);

      return {
        status,
        message: this.invitationMessageForStatus(status),
        failureCode: error.code,
        failureReason: error.safeMessage,
        actionRequired: this.actionRequiredForFailureCode(error.code),
        providerStatusCode: error.providerStatus,
        canResendInvite: !this.isNonRetryableInviteFailure(error.code),
      };
    }

    const status = this.shouldQueueInvitationFailure(error) ? 'queued' : 'failed';
    const message = error instanceof Error ? error.message : '';

    return {
      status,
      message: this.invitationMessageForStatus(status),
      failureCode: status === 'queued' ? 'provider_network_error' : 'provider_rejected',
      failureReason: message || this.invitationMessageForStatus(status),
      actionRequired: this.actionRequiredForFailureCode(
        status === 'queued' ? 'provider_network_error' : 'provider_rejected',
      ),
      canResendInvite: true,
    };
  }

  private statusForEmailDeliveryError(code: EmailDeliveryErrorCode): InvitationDeliveryStatus {
    if (this.isNonRetryableInviteFailure(code)) {
      return 'blocked';
    }

    if (code === 'provider_timeout' || code === 'provider_network_error') {
      return 'queued';
    }

    return 'failed';
  }

  private isNonRetryableInviteFailure(code: string): boolean {
    return code === 'email_not_configured' || code === 'resend_domain_not_verified';
  }

  private isPersistedInviteFailureStillBlocked(code: string): boolean {
    if (code === 'resend_domain_not_verified' && this.hasLikelyProductionSenderConfigured()) {
      return false;
    }

    return this.isNonRetryableInviteFailure(code);
  }

  private hasLikelyProductionSenderConfigured(): boolean {
    return typeof this.emailService.hasLikelyProductionSenderConfigured === 'function'
      ? this.emailService.hasLikelyProductionSenderConfigured()
      : false;
  }

  private invitationMessageForStatus(status: InvitationDeliveryStatus): string {
    if (status === 'sent') {
      return 'School created. Invitation sent.';
    }

    if (status === 'queued') {
      return 'School created. The admin invite is queued for delivery.';
    }

    if (status === 'blocked') {
      return 'School created, but invite delivery is blocked by email provider setup.';
    }

    return 'School created. The invite could not be delivered yet. You can resend it.';
  }

  private actionRequiredForFailureCode(code: string): string {
    if (code === 'resend_domain_not_verified') {
      return 'Verify a Resend sending domain, set EMAIL_FROM to an address on that domain, redeploy, then resend the invite.';
    }

    if (code === 'email_not_configured') {
      return 'Configure RESEND_API_KEY, EMAIL_FROM, and PUBLIC_APP_URL for the API deployment before sending invites.';
    }

    if (code === 'provider_timeout' || code === 'provider_network_error') {
      return 'Check provider connectivity and retry. If this repeats, inspect API logs before resending in bulk.';
    }

    return 'Open API logs for the provider rejection details, correct the email setup, then retry.';
  }

  private shouldQueueInvitationFailure(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    return (
      message.includes('timed out') ||
      message.includes('timeout') ||
      message.includes('temporarily') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econn')
    );
  }

  private async withDeliveryTimeout<T>(operation: Promise<T>): Promise<T> {
    const timeoutMs = this.getInvitationDeliveryTimeoutMs();
    let timeout: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Invitation email delivery timed out.')),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private normalizeTenantId(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(normalized)) {
      throw new BadRequestException('Use a school URL slug with letters, numbers, and hyphens.');
    }

    return normalized;
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

  private getInvitationDeliveryTimeoutMs(): number {
    const timeoutMs = Number(
      this.configService.get<number>('email.invitationDeliveryTimeoutMs') ?? 26_000,
    );

    return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 26_000;
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

  private parseInviteMetadata(
    value: InvitationContextRow['invite_metadata'],
  ): Record<string, unknown> {
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

  private toCount(value: string | number | null | undefined): number {
    const count = Number(value ?? 0);

    return Number.isFinite(count) ? count : 0;
  }

  private toOptionalCount(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return this.toCount(value);
  }
}
