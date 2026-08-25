import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const BOARDING_REFERRAL_TARGET_ROLES = [
  'boarding_master',
  'nurse',
  'discipline_master',
  'school_counsellor',
  'deputy_principal',
  'principal',
] as const;

export type BoardingReferralTargetRole = typeof BOARDING_REFERRAL_TARGET_ROLES[number];

export class SubmitLegacyBoardingRollCallDto {
  @IsUUID()
  house_id!: string;

  @IsIn(['clear', 'attention_required'])
  status!: 'clear' | 'attention_required';

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  missing_student_ids?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateBoardingReferralDto {
  @IsUUID()
  student_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;

  @IsOptional()
  @IsIn(BOARDING_REFERRAL_TARGET_ROLES)
  referred_to?: BoardingReferralTargetRole;
}

export class LegacyExeatRequestDto {
  @IsUUID()
  student_id!: string;

  @IsUUID()
  guardian_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  leave_type!: string;

  @IsDateString({ strict: true })
  from_date!: string;

  @IsDateString({ strict: true })
  to_date!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}

export class HandleLegacyExeatDto {
  @IsIn(['add_request', 'approve_request', 'forward_request'])
  action!: 'add_request' | 'approve_request' | 'forward_request';

  @ValidateIf((dto: HandleLegacyExeatDto) => dto.action === 'add_request')
  @ValidateNested()
  @Type(() => LegacyExeatRequestDto)
  request?: LegacyExeatRequestDto;

  @ValidateIf((dto: HandleLegacyExeatDto) => dto.action !== 'add_request')
  @IsUUID()
  id?: string;
}
