import { IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class ApproveStaffContractDto {
  @IsString()
  staff_profile_id!: string;

  @IsString()
  role_title!: string;

  @IsString()
  employment_type!: string;

  @IsString()
  workload!: string;

  @IsString()
  starts_on!: string;

  @IsOptional()
  @IsString()
  ends_on?: string;

  @IsIn(['draft', 'approved'])
  approval_state!: 'draft' | 'approved';
}

export class RequestLeaveDto {
  @IsUUID()
  staff_profile_id!: string;

  @IsString()
  leave_type!: string;

  @IsNumber()
  @Min(1)
  requested_days!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ApproveLeaveRequestDto {
  @IsUUID()
  staff_profile_id!: string;

  @IsString()
  leave_type!: string;

  @IsNumber()
  @Min(1)
  requested_days!: number;

  @IsString()
  @IsOptional()
  override_reason?: string;
}

export class UpdateLeaveStatusDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UploadStaffDocumentDto {
  @IsUUID()
  staff_profile_id!: string;

  @IsString()
  document_type!: string;

  @IsString()
  stored_path!: string;

  @IsDateString()
  @IsOptional()
  expires_on?: string;
}

export class VerifyStaffDocumentDto {
  @IsString()
  @IsIn(['verified', 'rejected'])
  status!: 'verified' | 'rejected';
}

export class CreateDepartmentDto {
  @IsString()
  name!: string;
}

export class CreateJobTitleDto {
  @IsUUID()
  @IsOptional()
  department_id?: string;

  @IsString()
  title!: string;
}

export class AssignRoleDto {
  @IsUUID()
  staff_profile_id!: string;

  @IsUUID()
  @IsOptional()
  department_id?: string;

  @IsUUID()
  @IsOptional()
  job_title_id?: string;
}

export class CreatePayrollBandDto {
  @IsString()
  name!: string;

  @IsNumber()
  base_salary!: number;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class SetStaffSalaryDto {
  @IsUUID()
  staff_profile_id!: string;

  @IsUUID()
  @IsOptional()
  payroll_band_id?: string;

  @IsNumber()
  @IsOptional()
  custom_base_salary?: number;
}

export class GeneratePayslipDto {
  @IsUUID()
  staff_profile_id!: string;

  @IsNumber()
  month!: number;

  @IsNumber()
  year!: number;

  @IsNumber()
  @IsOptional()
  deductions?: number;

  @IsNumber()
  @IsOptional()
  bonuses?: number;
}

export class CreatePerformanceReviewDto {
  @IsUUID()
  staff_profile_id!: string;

  @IsString()
  review_date!: string;

  @IsNumber()
  score!: number;

  @IsString()
  comments!: string;

  @IsString()
  @IsOptional()
  goals_for_next_period?: string;
}

export class CreateDisciplinaryRecordDto {
  @IsUUID()
  staff_profile_id!: string;

  @IsString()
  incident_date!: string;

  @IsString()
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  action_taken?: string;
}

export class GetLeaveRequestsDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsOptional()
  staff_profile_id?: string;
}

export class ChangeStaffStatusDto {
  @IsString()
  staff_profile_id!: string;

  @IsIn([
    'invited',
    'pending_acceptance',
    'profile_incomplete',
    'pending_approval',
    'active',
    'on_leave',
    'suspended',
    'exiting',
    'exited',
    'archived',
    'reactivated',
  ])
  status!:
    | 'invited'
    | 'pending_acceptance'
    | 'profile_incomplete'
    | 'pending_approval'
    | 'active'
    | 'on_leave'
    | 'suspended'
    | 'exiting'
    | 'exited'
    | 'archived'
    | 'reactivated';

  @IsString()
  reason!: string;
}

export class InviteStaffDto {
  @IsString()
  display_name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional()
  @IsString()
  job_title_id?: string;
}

export class AcceptInviteDto {
  @IsString()
  staff_profile_id!: string;
}

export class CompleteProfileDto {
  @IsString()
  staff_profile_id!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  statutory_identifiers?: Record<string, string>;

  @IsOptional()
  emergency_contact?: Record<string, string>;
}

export class ApproveStaffDto {
  @IsString()
  staff_profile_id!: string;

  @IsString()
  staff_number!: string;

  @ValidateNested()
  contract!: ApproveStaffContractDto;
}

export class ReactivateStaffDto {
  @IsString()
  staff_profile_id!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetStaffAttendanceDto {
  @IsString()
  date!: string;
}

export class MarkStaffAttendanceDto {
  @IsString()
  staff_profile_id!: string;
  @IsString()
  date!: string;
  @IsString()
  status!: string;
  @IsOptional()
  @IsString()
  notes?: string;
}
