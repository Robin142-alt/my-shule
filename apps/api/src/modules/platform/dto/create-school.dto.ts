import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  school_name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  tenant_id!: string;

  @IsEmail()
  admin_email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  admin_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  county?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  module_codes?: string[];
}

export class DeleteSchoolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  confirmation!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(240)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  hard_delete_empty_tenant?: boolean;
}

export class AnonymizeTenantOffboardingDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  confirmation!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(240)
  reason!: string;
}

export type PlatformSchoolResponseDto = {
  tenant_id: string;
  school_name: string;
  subdomain: string;
  status: 'active' | 'inactive';
  invitation_sent: boolean;
  invitation_status: 'sent' | 'queued' | 'failed' | 'blocked';
  invitation_message: string;
  invitation_failure_code?: string;
  invitation_failure_reason?: string;
  invitation_action_required?: string;
  can_resend_invite: boolean;
  invite_expires_at: string;
  admin_email: string;
  created_at: string;
  enabled_modules: string[];
};

export type PlatformSchoolUsageSummaryDto = {
  memberships: number;
  students: number;
  invoices: number;
  support_tickets: number;
  mpesa_transactions: number;
};

export type PlatformSchoolDeleteResponseDto = {
  tenant_id: string;
  deleted: boolean;
  deprovisioned: boolean;
  message: string;
  usage_summary: PlatformSchoolUsageSummaryDto;
  school?: PlatformSchoolResponseDto;
};

export type PlatformTenantOffboardingManifestDto = {
  tenant_id: string;
  school_name: string;
  export_type: 'contract_offboarding';
  generated_at: string;
  usage_summary: PlatformSchoolUsageSummaryDto;
  tables: Array<{
    name: string;
    category: string;
    retention: string;
  }>;
  retention_policy: {
    payment_records: string;
    audit_logs: string;
    health_discipline_notes: string;
    raw_provider_payloads: string;
    report_card_artifacts: string;
  };
};

export type PlatformTenantAnonymizeResponseDto = {
  tenant_id: string;
  anonymized: boolean;
  message: string;
  usage_summary: PlatformSchoolUsageSummaryDto;
  school: PlatformSchoolResponseDto;
};

export type PlatformEmailReadinessResponseDto = {
  provider: string;
  status: 'configured' | 'missing' | 'blocked' | 'degraded';
  api_key_configured: boolean;
  sender_configured: boolean;
  public_app_url_configured: boolean;
  last_invite_status?: string;
  last_failure_code?: string;
  last_failure_reason?: string;
  action_required?: string;
};
