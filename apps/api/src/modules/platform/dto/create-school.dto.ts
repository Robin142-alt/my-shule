import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export type SchoolInstitutionCategory =
  | 'international_school'
  | 'primary_school'
  | 'junior_school'
  | 'secondary_high_school';

export type SchoolCurriculum =
  | 'cbc'
  | 'cbe'
  | '8-4-4'
  | 'cambridge'
  | 'igcse'
  | 'international';

export type SchoolOnboardingStepStatus = 'pending' | 'planned' | 'complete' | 'blocked';

export type SchoolOnboardingProfileDto = {
  registration_number?: string;
  knec_code?: string;
  county?: string;
  location?: string;
  contacts?: Record<string, string>;
  curriculum?: SchoolCurriculum;
  institution_category?: SchoolInstitutionCategory;
  campuses: Array<{ name: string; code: string }>;
  academic_calendar?: Record<string, unknown>;
  fee_categories: string[];
  sms_sender_id?: string;
  domain?: string;
  quotas?: {
    students?: number;
    staff?: number;
    storage_gb?: number;
    sms_per_term?: number;
    devices?: number;
  };
  import_plan: string[];
  service_activation: string[];
  training_status: 'pending' | 'scheduled' | 'complete';
  audit_verification_status: 'pending' | 'verified' | 'failed';
  onboarding_steps: Record<
    'create_school' | 'select_modules' | 'configure_structure' | 'import_data' | 'activate_services' | 'go_live',
    SchoolOnboardingStepStatus
  >;
};

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
  @IsString()
  @MaxLength(80)
  registration_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  knec_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsObject()
  contacts?: Record<string, string>;

  @IsOptional()
  @IsIn(['cbc', 'cbe', '8-4-4', 'cambridge', 'igcse', 'international'])
  curriculum?: SchoolCurriculum;

  @IsOptional()
  @IsIn(['international_school', 'primary_school', 'junior_school', 'secondary_high_school'])
  institution_category?: SchoolInstitutionCategory;

  @IsOptional()
  @IsArray()
  campuses?: Array<{ name: string; code: string }>;

  @IsOptional()
  @IsObject()
  academic_calendar?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fee_categories?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sms_sender_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  domain?: string;

  @IsOptional()
  @IsObject()
  quotas?: SchoolOnboardingProfileDto['quotas'];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  import_plan?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  service_activation?: string[];

  @IsOptional()
  @IsIn(['pending', 'scheduled', 'complete'])
  training_status?: SchoolOnboardingProfileDto['training_status'];

  @IsOptional()
  @IsIn(['pending', 'verified', 'failed'])
  audit_verification_status?: SchoolOnboardingProfileDto['audit_verification_status'];

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
  onboarding_profile?: SchoolOnboardingProfileDto;
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
