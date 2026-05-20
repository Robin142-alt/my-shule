import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export type DataSubjectRequestType =
  | 'access_request'
  | 'correction_request'
  | 'deletion_anonymization_request'
  | 'export_request'
  | 'objection_request';

export type DataSubjectRequestStatus =
  | 'submitted'
  | 'identity_verification'
  | 'in_review'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export class SubmitDataSubjectRequestDto {
  @Transform(trim)
  @IsIn([
    'access_request',
    'correction_request',
    'deletion_anonymization_request',
    'export_request',
    'objection_request',
  ])
  request_type!: DataSubjectRequestType;

  @Transform(trim)
  @IsOptional()
  @IsUUID()
  subject_user_id?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(240)
  legal_basis?: string;

  @IsOptional()
  @IsObject()
  requested_payload?: Record<string, unknown>;
}

export class VerifyDataSubjectRequestIdentityDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  verification_method!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  verification_reference?: string;
}

export class ReviewDataSubjectRequestDto {
  @Transform(trim)
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class CompleteDataSubjectRequestDto {
  @IsOptional()
  @IsObject()
  response_payload?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  anonymize_subject?: boolean;
}

export class DataSubjectRequestSlaDto {
  due_at!: string;
  days_remaining!: number;
  overdue!: boolean;
}

export class DataSubjectRequestResponseDto {
  id!: string;
  tenant_id!: string;
  requester_user_id!: string;
  subject_user_id!: string | null;
  request_type!: DataSubjectRequestType;
  status!: DataSubjectRequestStatus;
  legal_basis!: string | null;
  requested_payload!: Record<string, unknown>;
  response_payload!: Record<string, unknown>;
  sla!: DataSubjectRequestSlaDto;
  completed_at!: string | null;
  created_at!: string;
  updated_at!: string;
}
