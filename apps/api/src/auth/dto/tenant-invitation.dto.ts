import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const TENANT_INVITABLE_ROLE_CODES = [
  'principal',
  'deputy_principal',
  'secretary',
  'bursar',
  'accountant',
  'teacher',
  'dean_academics',
  'exams_manager',
  'hod',
  'class_teacher',
  'grade_master',
  'nurse',
  'school_counsellor',
  'discipline_master',
  'librarian',
  'parent',
  'student',
  'storekeeper',
  'boarding_master',
  'security_officer',
  'transport_manager',
  'lab_technician',
  'admissions_officer',
  'ict_manager',
] as const;

export type TenantInvitableRoleCode = (typeof TENANT_INVITABLE_ROLE_CODES)[number];

export class CreateTenantInvitationDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  display_name!: string;

  @IsString()
  @IsIn(TENANT_INVITABLE_ROLE_CODES)
  role_code!: string;
}

export class UpdateTenantMembershipStatusDto {
  @IsString()
  @IsIn(['active', 'suspended'])
  status!: 'active' | 'suspended';
}

export class UpdateTenantMembershipRoleDto {
  @IsString()
  @IsIn(TENANT_INVITABLE_ROLE_CODES)
  role_code!: string;
}

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ListTenantUsersQueryDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @Transform(trim)
  @IsOptional()
  @IsIn(TENANT_INVITABLE_ROLE_CODES)
  role_code?: string;

  @Transform(trim)
  @IsOptional()
  @IsIn(['active', 'suspended', 'invited', 'expired'])
  status?: TenantManagedUserStatus;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export type TenantInvitationResponseDto = {
  id?: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role_code: TenantInvitableRoleCode;
  invitation_sent: true;
  expires_at: string;
};

export type TenantManagedUserStatus = 'active' | 'suspended' | 'invited' | 'expired';

export type TenantManagedUserDto = {
  id: string;
  kind: 'member' | 'invitation';
  display_name: string;
  email: string;
  role_code: string;
  role_name: string;
  status: TenantManagedUserStatus;
  expires_at: string | null;
  created_at: string;
};

export type TenantManagedUsersResponseDto = {
  users: TenantManagedUserDto[];
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
  };
};

export type TenantInvitationActionResponseDto = {
  id: string;
  status?: 'revoked';
  invitation_sent?: true;
  expires_at?: string;
};
