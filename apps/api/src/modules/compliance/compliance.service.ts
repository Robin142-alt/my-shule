import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AUTH_ANONYMOUS_USER_ID } from '../../auth/auth.constants';
import { SessionService } from '../../auth/session.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { DatabaseService } from '../../database/database.service';
import { AuditLogService } from '../observability/audit-log.service';
import { BreachResponseReportExportDto } from './dto/breach-response-report.dto';
import { ConsentRecordResponseDto } from './dto/consent-record-response.dto';
import { DataExportResponseDto, ExportedMembershipDto, ExportedUserDto } from './dto/data-export-response.dto';
import {
  CompleteDataSubjectRequestDto,
  DataSubjectRequestResponseDto,
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  ReviewDataSubjectRequestDto,
  SubmitDataSubjectRequestDto,
  VerifyDataSubjectRequestIdentityDto,
} from './dto/data-subject-request.dto';
import { DeleteAccountResponseDto } from './dto/delete-account-response.dto';
import { RecordConsentDto } from './dto/record-consent.dto';

interface UserExportRow {
  id: string;
  email: string;
  display_name: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface MembershipExportRow {
  tenant_id: string;
  role_code: string;
  role_name: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface ConsentRecordRow {
  id: string;
  tenant_id: string;
  consent_type: string;
  status: 'granted' | 'revoked' | 'withdrawn';
  policy_version: string;
  metadata: Record<string, unknown> | null;
  captured_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface DataSubjectRequestRow {
  id: string;
  tenant_id: string;
  requester_user_id: string;
  subject_user_id: string | null;
  request_type: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  legal_basis: string | null;
  requested_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  due_at: Date;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface BreachResponseReportRow {
  id: string;
  tenant_id: string;
  incident_number: string;
  severity: string;
  status: string;
  detected_at: Date;
  contained_at: Date | null;
  reported_to_odpc_at: Date | null;
  affected_categories: string[] | null;
  evidence_export: Record<string, unknown> | null;
}

const DSR_DEFAULT_DUE_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const REDACTED_VALUE = '[redacted]';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly databaseService: DatabaseService,
    private readonly sessionService: SessionService,
    @Optional() private readonly auditLogService?: AuditLogService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async exportMyData(): Promise<DataExportResponseDto> {
    const { tenantId, userId } = this.requireAuthenticatedContext();
    const user = await this.loadUser(userId);
    const membership = await this.loadCurrentMembership(userId, tenantId);
    const consents = await this.listConsentRows(tenantId, userId);

    return Object.assign(new DataExportResponseDto(), {
      generated_at: new Date().toISOString(),
      user: this.mapUser(user),
      membership: this.mapMembership(membership),
      consents: consents.map((consent) => this.mapConsent(consent)),
    });
  }

  async listMyConsents(): Promise<ConsentRecordResponseDto[]> {
    const { tenantId, userId } = this.requireAuthenticatedContext();
    await this.loadCurrentMembership(userId, tenantId);
    const consents = await this.listConsentRows(tenantId, userId);
    return consents.map((consent) => this.mapConsent(consent));
  }

  async recordMyConsent(dto: RecordConsentDto): Promise<ConsentRecordResponseDto> {
    const { tenantId, userId } = this.requireAuthenticatedContext();
    await this.loadCurrentMembership(userId, tenantId);

    const consent = await this.databaseService.withRequestTransaction(async () => {
      const result = await this.databaseService.query<ConsentRecordRow>(
        `
          INSERT INTO consent_records (
            tenant_id,
            user_id,
            consent_type,
            status,
            policy_version,
            metadata,
            captured_at
          )
          VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, NOW())
          RETURNING
            id,
            tenant_id,
            consent_type,
            status,
            policy_version,
            metadata,
            captured_at,
            created_at,
            updated_at
        `,
        [
          tenantId,
          userId,
          dto.consent_type.trim(),
          dto.status,
          dto.policy_version.trim(),
          JSON.stringify(dto.metadata ?? {}),
        ],
      );

      return result.rows[0];
    });

    return this.mapConsent(consent);
  }

  async submitDataSubjectRequest(dto: SubmitDataSubjectRequestDto): Promise<DataSubjectRequestResponseDto> {
    const { tenantId, userId } = this.requireAuthenticatedContext();
    const subjectUserId = dto.subject_user_id?.trim() || userId;
    const dueAt = new Date(Date.now() + this.resolveDataSubjectRequestDueDays() * MILLISECONDS_PER_DAY);

    const request = await this.databaseService.withRequestTransaction(async () => {
      const result = await this.databaseService.query<DataSubjectRequestRow>(
        `
          INSERT INTO data_subject_requests (
            tenant_id,
            requester_user_id,
            subject_user_id,
            request_type,
            status,
            legal_basis,
            requested_payload,
            due_at
          )
          VALUES ($1, $2::uuid, $3::uuid, $4, 'submitted', $5, $6::jsonb, $7::timestamptz)
          RETURNING
            id,
            tenant_id,
            requester_user_id,
            subject_user_id,
            request_type,
            status,
            legal_basis,
            requested_payload,
            response_payload,
            due_at,
            completed_at,
            created_at,
            updated_at
        `,
        [
          tenantId,
          userId,
          subjectUserId,
          dto.request_type,
          dto.legal_basis?.trim() || null,
          JSON.stringify(dto.requested_payload ?? {}),
          dueAt.toISOString(),
        ],
      );

      return this.requireDataSubjectRequestRow(result.rows[0]);
    });

    await this.recordComplianceAudit('data_subject_request.submitted', 'data_subject_request', request.id, {
      request_type: request.request_type,
      subject_user_id: request.subject_user_id,
      due_at: request.due_at.toISOString(),
    });

    return this.mapDataSubjectRequest(request);
  }

  async verifyDataSubjectRequestIdentity(
    requestId: string,
    dto: VerifyDataSubjectRequestIdentityDto,
  ): Promise<DataSubjectRequestResponseDto> {
    const { tenantId } = this.requireAuthenticatedContext();
    const verification = {
      method: dto.verification_method.trim(),
      reference: dto.verification_reference?.trim() ?? null,
      verified_at: new Date().toISOString(),
    };
    const request = await this.updateDataSubjectRequestStatus({
      tenantId,
      requestId,
      nextStatus: 'identity_verification',
      allowedStatuses: ['submitted', 'identity_verification'],
      responsePatch: { identity_verification: verification },
    });

    await this.recordComplianceAudit('data_subject_request.identity_verified', 'data_subject_request', request.id, {
      verification_method: verification.method,
    });

    return this.mapDataSubjectRequest(request);
  }

  async reviewDataSubjectRequest(
    requestId: string,
    dto: ReviewDataSubjectRequestDto,
  ): Promise<DataSubjectRequestResponseDto> {
    const { tenantId } = this.requireAuthenticatedContext();
    const approved = dto.decision === 'approved';
    const request = await this.updateDataSubjectRequestStatus({
      tenantId,
      requestId,
      nextStatus: approved ? 'in_review' : 'rejected',
      allowedStatuses: ['submitted', 'identity_verification', 'in_review'],
      responsePatch: {
        review: {
          decision: dto.decision,
          reason: dto.reason.trim(),
          reviewed_at: new Date().toISOString(),
        },
      },
      completeNow: !approved,
    });

    await this.recordComplianceAudit(
      approved ? 'data_subject_request.approved' : 'data_subject_request.rejected',
      'data_subject_request',
      request.id,
      { reason: dto.reason.trim() },
    );

    return this.mapDataSubjectRequest(request);
  }

  async completeDataSubjectRequest(
    requestId: string,
    dto: CompleteDataSubjectRequestDto,
  ): Promise<DataSubjectRequestResponseDto> {
    const { tenantId } = this.requireAuthenticatedContext();

    if (dto.anonymize_subject) {
      await this.anonymizeDataSubject(tenantId, requestId);
    }

    const request = await this.updateDataSubjectRequestStatus({
      tenantId,
      requestId,
      nextStatus: 'completed',
      allowedStatuses: ['identity_verification', 'in_review'],
      responsePatch: {
        completion: {
          completed_at: new Date().toISOString(),
          anonymize_subject: Boolean(dto.anonymize_subject),
          ...(dto.response_payload ?? {}),
        },
      },
      completeNow: true,
    });

    await this.recordComplianceAudit('data_subject_request.completed', 'data_subject_request', request.id, {
      anonymize_subject: Boolean(dto.anonymize_subject),
    });

    return this.mapDataSubjectRequest(request);
  }

  async exportBreachResponseReport(reportId: string): Promise<BreachResponseReportExportDto> {
    const { tenantId } = this.requireAuthenticatedContext();
    const result = await this.databaseService.query<BreachResponseReportRow>(
      `
        SELECT
          id,
          tenant_id,
          incident_number,
          severity,
          status,
          detected_at,
          contained_at,
          reported_to_odpc_at,
          affected_categories,
          evidence_export
        FROM breach_response_reports
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [tenantId, reportId],
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException('Breach response report was not found');
    }

    await this.recordComplianceAudit('breach_response_report.exported', 'breach_response_report', row.id, {
      incident_number: row.incident_number,
      severity: row.severity,
      status: row.status,
    });

    return Object.assign(new BreachResponseReportExportDto(), {
      report_id: row.id,
      tenant_id: row.tenant_id,
      incident_number: row.incident_number,
      severity: row.severity,
      status: row.status,
      detected_at: row.detected_at.toISOString(),
      contained_at: row.contained_at?.toISOString() ?? null,
      reported_to_odpc_at: row.reported_to_odpc_at?.toISOString() ?? null,
      affected_categories: row.affected_categories ?? [],
      evidence_export: this.redactEvidence(row.evidence_export ?? {}),
      exported_at: new Date().toISOString(),
    });
  }

  async deleteMyAccount(): Promise<DeleteAccountResponseDto> {
    const { tenantId, userId } = this.requireAuthenticatedContext();
    const deletedAt = new Date().toISOString();

    await this.databaseService.withRequestTransaction(async () => {
      await this.loadCurrentMembership(userId, tenantId);
      const deletionResult = await this.databaseService.query<{ id: string }>(
        `
          DELETE FROM users
          WHERE id = $1::uuid
          RETURNING id
        `,
        [userId],
      );

      if (!deletionResult.rows[0]) {
        throw new UnauthorizedException('User account could not be deleted');
      }
    });

    await this.sessionService.invalidateUserSessions(userId);

    return {
      success: true,
      deleted_at: deletedAt,
      deleted_user_id: userId,
    };
  }

  private requireAuthenticatedContext(): { tenantId: string; userId: string } {
    const store = this.requestContext.requireStore();

    if (
      !store.is_authenticated
      || !store.user_id
      || store.user_id === AUTH_ANONYMOUS_USER_ID
      || !store.tenant_id
      || !store.session_id
    ) {
      throw new UnauthorizedException('An authenticated user context is required');
    }

    return {
      tenantId: store.tenant_id,
      userId: store.user_id,
    };
  }

  private async loadUser(userId: string): Promise<UserExportRow> {
    const result = await this.databaseService.query<UserExportRow>(
      `
        SELECT
          id,
          email,
          display_name,
          status,
          created_at,
          updated_at
        FROM users
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [userId],
    );

    if (!result.rows[0]) {
      throw new UnauthorizedException('User account is no longer available');
    }

    return result.rows[0];
  }

  private async loadCurrentMembership(
    userId: string,
    tenantId: string,
  ): Promise<MembershipExportRow> {
    const result = await this.databaseService.query<MembershipExportRow>(
      `
        SELECT
          tm.tenant_id,
          r.code AS role_code,
          r.name AS role_name,
          tm.status,
          tm.created_at,
          tm.updated_at
        FROM tenant_memberships tm
        INNER JOIN roles r
          ON r.id = tm.role_id
         AND r.tenant_id = tm.tenant_id
        WHERE tm.user_id = $1::uuid
          AND tm.tenant_id = $2
          AND tm.status = 'active'
        LIMIT 1
      `,
      [userId, tenantId],
    );

    if (!result.rows[0]) {
      throw new UnauthorizedException('User no longer has access to this tenant');
    }

    return result.rows[0];
  }

  private async listConsentRows(
    tenantId: string,
    userId: string,
  ): Promise<ConsentRecordRow[]> {
    const result = await this.databaseService.query<ConsentRecordRow>(
      `
        SELECT
          id,
          tenant_id,
          consent_type,
          status,
          policy_version,
          metadata,
          captured_at,
          created_at,
          updated_at
        FROM consent_records
        WHERE tenant_id = $1
          AND user_id = $2::uuid
        ORDER BY captured_at DESC, created_at DESC
      `,
      [tenantId, userId],
    );

    return result.rows;
  }

  private mapUser(user: UserExportRow): ExportedUserDto {
    return Object.assign(new ExportedUserDto(), {
      user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      status: user.status,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    });
  }

  private mapMembership(membership: MembershipExportRow): ExportedMembershipDto {
    return Object.assign(new ExportedMembershipDto(), {
      tenant_id: membership.tenant_id,
      role_code: membership.role_code,
      role_name: membership.role_name,
      status: membership.status,
      created_at: membership.created_at.toISOString(),
      updated_at: membership.updated_at.toISOString(),
    });
  }

  private mapConsent(consent: ConsentRecordRow): ConsentRecordResponseDto {
    return Object.assign(new ConsentRecordResponseDto(), {
      id: consent.id,
      tenant_id: consent.tenant_id,
      consent_type: consent.consent_type,
      status: consent.status,
      policy_version: consent.policy_version,
      metadata: consent.metadata ?? {},
      captured_at: consent.captured_at.toISOString(),
      created_at: consent.created_at.toISOString(),
      updated_at: consent.updated_at.toISOString(),
    });
  }

  private async updateDataSubjectRequestStatus(input: {
    tenantId: string;
    requestId: string;
    nextStatus: DataSubjectRequestStatus;
    allowedStatuses: DataSubjectRequestStatus[];
    responsePatch: Record<string, unknown>;
    completeNow?: boolean;
  }): Promise<DataSubjectRequestRow> {
    const result = await this.databaseService.query<DataSubjectRequestRow>(
      `
        UPDATE data_subject_requests
        SET
          status = '${input.nextStatus}',
          response_payload = response_payload || $3::jsonb,
          completed_at = CASE WHEN $4::boolean THEN NOW() ELSE completed_at END,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = ANY($5::text[])
        RETURNING
          id,
          tenant_id,
          requester_user_id,
          subject_user_id,
          request_type,
          status,
          legal_basis,
          requested_payload,
          response_payload,
          due_at,
          completed_at,
          created_at,
          updated_at
      `,
      [
        input.tenantId,
        input.requestId,
        JSON.stringify(input.responsePatch),
        Boolean(input.completeNow),
        input.allowedStatuses,
      ],
    );

    return this.requireDataSubjectRequestRow(result.rows[0]);
  }

  private async anonymizeDataSubject(tenantId: string, requestId: string): Promise<void> {
    const result = await this.databaseService.query<{ id: string }>(
      `
        UPDATE users
        SET
          email = CONCAT('anonymized+', id::text, '@deleted.local'),
          display_name = 'Anonymized user',
          status = 'deleted',
          updated_at = NOW()
        WHERE id = (
          SELECT subject_user_id
          FROM data_subject_requests
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND request_type = 'deletion_anonymization_request'
          LIMIT 1
        )
        RETURNING id
      `,
      [tenantId, requestId],
    );
    const subjectUserId = result.rows[0]?.id;

    if (!subjectUserId) {
      throw new BadRequestException('No deletable data subject was found for this request');
    }

    await this.sessionService.invalidateUserSessions(subjectUserId);
    await this.recordComplianceAudit('data_subject_request.subject_anonymized', 'data_subject_request', requestId, {
      subject_user_id: subjectUserId,
    });
  }

  private requireDataSubjectRequestRow(row: DataSubjectRequestRow | undefined): DataSubjectRequestRow {
    if (!row) {
      throw new NotFoundException('Data subject request was not found or is not in a valid workflow state');
    }

    return row;
  }

  private mapDataSubjectRequest(request: DataSubjectRequestRow): DataSubjectRequestResponseDto {
    const daysRemaining = Math.ceil((request.due_at.getTime() - Date.now()) / MILLISECONDS_PER_DAY);

    return Object.assign(new DataSubjectRequestResponseDto(), {
      id: request.id,
      tenant_id: request.tenant_id,
      requester_user_id: request.requester_user_id,
      subject_user_id: request.subject_user_id,
      request_type: request.request_type,
      status: request.status,
      legal_basis: request.legal_basis,
      requested_payload: request.requested_payload ?? {},
      response_payload: request.response_payload ?? {},
      sla: {
        due_at: request.due_at.toISOString(),
        days_remaining: Math.max(0, daysRemaining),
        overdue: daysRemaining < 0,
      },
      completed_at: request.completed_at?.toISOString() ?? null,
      created_at: request.created_at.toISOString(),
      updated_at: request.updated_at.toISOString(),
    });
  }

  private async recordComplianceAudit(
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.auditLogService?.record({
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
    });
  }

  private resolveDataSubjectRequestDueDays(): number {
    const configuredDays = Number(this.configService?.get<number>('compliance.dataSubjectRequestDueDays') ?? DSR_DEFAULT_DUE_DAYS);
    return Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : DSR_DEFAULT_DUE_DAYS;
  }

  private redactEvidence(value: unknown): Record<string, unknown> {
    const redacted = this.redactValue(value);
    return typeof redacted === 'object' && redacted !== null && !Array.isArray(redacted)
      ? redacted as Record<string, unknown>
      : {};
  }

  private redactValue(value: unknown, key = ''): unknown {
    if (this.isSensitiveEvidenceKey(key)) {
      return REDACTED_VALUE;
    }

    if (typeof value === 'string') {
      return this.redactSensitiveString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item));
    }

    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([entryKey, entryValue]) => [
          entryKey,
          this.redactValue(entryValue, entryKey),
        ]),
      );
    }

    return value;
  }

  private isSensitiveEvidenceKey(key: string): boolean {
    return /(phone|payer|name|email|admission|national|id_number|raw_payload|callback_body)/i.test(key);
  }

  private redactSensitiveString(value: string): string {
    return value
      .replace(/\b(?:254|0)7\d{8}\b/g, REDACTED_VALUE)
      .replace(/\b(?:Jane|John|Mary|Grace|Amina|Parent)\b(?:\s+\b(?:Parent|Otieno|Wanjiku|Mwangi|Achieng)\b)?/g, REDACTED_VALUE);
  }
}
