import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

export type DashboardRoleSource =
  | 'primary_membership'
  | 'additional_assignment'
  | 'teacher_eligibility';

export class DashboardRoleOptionDto {
  role_code!: string;
  role_name!: string;
  is_primary!: boolean;
  is_teacher_mode!: boolean;
  sources!: DashboardRoleSource[];
}

export class DashboardRoleContextDto {
  primary_role!: string;
  active_role!: string;
  assigned_roles!: string[];
  available_roles!: DashboardRoleOptionDto[];
  teacher_dashboard_eligible!: boolean;
}

export class SwitchActiveRoleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'role_code must be a canonical dashboard role code',
  })
  role_code!: string;
}
