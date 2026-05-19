import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertModuleRegistryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsObject()
  feature_flags?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsInt()
  @Min(0)
  base_price_cents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  per_student_price_cents?: number;

  @IsOptional()
  @IsObject()
  billing_metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  route_segment?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permission_scopes?: string[];
}

export class SetSchoolModulesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  module_codes!: string[];
}

export class ToggleSchoolModuleDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsIn(['standard', 'trial', 'premium', 'enterprise'])
  access_level?: 'standard' | 'trial' | 'premium' | 'enterprise';

  @IsOptional()
  @IsString()
  trial_ends_at?: string | null;

  @IsOptional()
  @IsString()
  expires_at?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  billing_plan_code?: string | null;

  @IsOptional()
  @IsObject()
  feature_flags?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  activation_reason?: string | null;
}

export class CreateModulePackageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsIn(['per_student', 'per_module', 'tiered', 'enterprise', 'custom'])
  pricing_model?: 'per_student' | 'per_module' | 'tiered' | 'enterprise' | 'custom';

  @IsOptional()
  @IsObject()
  billing_metadata?: Record<string, unknown>;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  module_codes!: string[];
}

export class CloneModulePackageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}

export type ModuleRegistryResponseDto = {
  id?: string;
  code: string;
  name: string;
  description: string;
  feature_flags: Record<string, unknown>;
  status: 'active' | 'inactive';
  base_price_cents: number;
  per_student_price_cents: number;
  billing_metadata: Record<string, unknown>;
  category: string;
  route_segment: string | null;
  permission_scopes: string[];
};

export type SchoolModuleAccessResponseDto = ModuleRegistryResponseDto & {
  enabled: boolean;
  enabled_at?: string | null;
  disabled_at?: string | null;
  updated_by?: string | null;
  access_level: string;
  trial_ends_at?: string | null;
  expires_at?: string | null;
  billing_plan_code?: string | null;
  assignment_feature_flags: Record<string, unknown>;
};
