import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { SUPERADMIN_ROLE_OWNER } from '../../auth/auth.constants';
import { AuthEmailService } from '../../auth/auth-email.service';
import { AuthorizationRepository } from '../../auth/repositories/authorization.repository';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { DatabaseService } from '../../database/database.service';
import { CreateSchoolDto, PlatformSchoolResponseDto } from './dto/create-school.dto';

type TenantRow = {
  tenant_id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'inactive';
  created_at: Date | string;
  admin_email?: string | null;
  invitation_status?: 'pending' | 'processing' | 'sent' | 'failed' | null;
  invite_expires_at?: Date | string | null;
};

type InvitationDeliveryStatus = PlatformSchoolResponseDto['invitation_status'];

type InvitationDeliveryResult = {
  status: InvitationDeliveryStatus;
  message: string;
};

type InvitationAction = {
  outboxId?: string;
  tenantId: string;
  schoolName: string;
  adminEmail: string;
  adminName: string;
  inviteUrl: string;
  expiresAt: Date;
};

type InvitationContextRow = TenantRow & {
  invite_metadata?: Record<string, unknown> | string | null;
};

@Injectable()
export class PlatformOnboardingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly emailService: AuthEmailService,
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
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
          latest_token.expires_at AS invite_expires_at
        FROM tenants
        LEFT JOIN LATERAL (
          SELECT recipient_email, status
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
        ORDER BY tenants.created_at DESC, tenants.name ASC
      `,
    );

    return result.rows.map((row) =>
      this.toPlatformSchoolResponse(row, {
        status: this.mapOutboxStatus(row.invitation_status),
        message: this.invitationMessageForStatus(this.mapOutboxStatus(row.invitation_status)),
      }),
    );
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
        county: dto.county?.trim() || null,
        invitedByUserId,
      });

      await this.authorizationRepository.ensureTenantAuthorizationBaseline(tenantId);

      const invitation = await this.prepareInvitationAction({
        tenantId,
        schoolName,
        adminEmail,
        adminName,
        invitedByUserId,
      });

      return { tenant, invitation };
    });

    const delivery = await this.deliverInvitation(transactionResult.invitation);

    return this.toPlatformSchoolResponse(transactionResult.tenant, delivery, {
      adminEmail,
      inviteExpiresAt: transactionResult.invitation.expiresAt,
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

    return this.toPlatformSchoolResponse(transactionResult.tenant, delivery, {
      adminEmail: transactionResult.adminEmail,
      inviteExpiresAt: transactionResult.invitation.expiresAt,
    });
  }

  private async createTenant(input: {
    tenantId: string;
    schoolName: string;
    county: string | null;
    invitedByUserId: string | null;
  }): Promise<TenantRow> {
    const result = await this.databaseService.query<TenantRow>(
      `
        INSERT INTO tenants (tenant_id, name, subdomain, status, settings, metadata)
        VALUES ($1, $2, $3, 'active', '{}'::jsonb, $4::jsonb)
        ON CONFLICT (tenant_id) DO NOTHING
        RETURNING tenant_id, name, subdomain, status, created_at
      `,
      [
        input.tenantId,
        input.schoolName,
        input.tenantId,
        JSON.stringify({
          county: input.county,
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
    const inviteUrl = this.buildInvitationUrl(token);
    const payload = {
      tenant_id: input.tenantId,
      tenant_name: input.schoolName,
      role_code: 'owner',
      display_name: input.adminName,
      invited_by_user_id: input.invitedByUserId,
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
        'You have been invited to ShuleHub ERP',
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
          inviteUrl: input.inviteUrl,
          expiresAt: input.expiresAt,
        }),
      );
      await this.markOutboxDelivery(input.outboxId, 'sent');

      return {
        status: 'sent',
        message: `School created. Invitation sent to ${input.adminEmail}.`,
      };
    } catch (error) {
      await this.markOutboxDelivery(input.outboxId, 'failed').catch(() => undefined);

      const status = this.shouldQueueInvitationFailure(error) ? 'queued' : 'failed';

      return {
        status,
        message: this.invitationMessageForStatus(status),
      };
    }
  }

  private async markOutboxDelivery(
    outboxId: string | undefined,
    status: 'sent' | 'failed',
  ): Promise<void> {
    if (!outboxId) {
      return;
    }

    await this.databaseService.query(
      'SELECT app.mark_auth_email_outbox_delivery($1, $2)',
      [outboxId, status],
    );
  }

  private toPlatformSchoolResponse(
    tenant: TenantRow,
    delivery: InvitationDeliveryResult,
    override?: {
      adminEmail?: string;
      inviteExpiresAt?: Date | string | null;
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
      invite_expires_at: inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : '',
      admin_email: override?.adminEmail ?? tenant.admin_email ?? '',
      created_at: new Date(tenant.created_at).toISOString(),
    };
  }

  private mapOutboxStatus(
    status: TenantRow['invitation_status'],
  ): InvitationDeliveryStatus {
    if (status === 'sent') {
      return 'sent';
    }

    if (status === 'failed') {
      return 'failed';
    }

    return 'queued';
  }

  private invitationMessageForStatus(status: InvitationDeliveryStatus): string {
    if (status === 'sent') {
      return 'School created. Invitation sent.';
    }

    if (status === 'queued') {
      return 'School created. The admin invite is queued for delivery.';
    }

    return 'School created. The invite could not be delivered yet. You can resend it.';
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
      this.configService.get<number>('email.invitationDeliveryTimeoutMs') ?? 12_000,
    );

    return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 12_000;
  }

  private buildInvitationUrl(token: string): string {
    const baseUrl = (
      this.configService.get<string>('email.publicAppUrl') ??
      'https://shule-hub-erp.vercel.app'
    ).replace(/\/$/, '');

    return `${baseUrl}/invite/accept?token=${encodeURIComponent(token)}`;
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
}
