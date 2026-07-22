import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateAdmissionSettingsDto {
  @IsIn(['manual', 'automatic', 'suggested'])
  admission_number_mode!: 'manual' | 'automatic' | 'suggested';

  @Transform(trim)
  @IsString()
  @MaxLength(20)
  admission_number_prefix!: string;

  @Transform(trim)
  @IsIn(['-', '/', '.', '_'])
  admission_number_separator!: '-' | '/' | '.' | '_';

  @IsInt()
  @Min(3)
  @Max(12)
  admission_number_padding!: number;

  @IsBoolean()
  include_academic_year!: boolean;

  @IsBoolean()
  strict_capacity!: boolean;

  @IsBoolean()
  strict_age_rules!: boolean;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(30)
  minimum_age?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(30)
  maximum_age?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  minimum_subjects?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  maximum_subjects?: number | null;
}

export class SaveAdmissionDraftDto {
  @IsObject()
  payload!: Record<string, unknown>;
}

export class ChangeStudentAdmissionNumberDto {
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  admission_number!: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;

  @Equals(true)
  confirmed!: true;
}

export class ChangeGuardianPhoneDto {
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  guardian_phone!: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;

  @Equals(true)
  confirmed!: true;
}
