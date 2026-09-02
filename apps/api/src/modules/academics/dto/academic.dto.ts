import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  name!: string;

  @IsDateString()
  starts_on!: string;

  @IsDateString()
  ends_on!: string;

  @IsOptional()
  @IsBoolean()
  is_current?: boolean;
}

export class CreateAcademicTermDto {
  @IsString()
  academic_year_id!: string;

  @IsString()
  name!: string;

  @IsDateString()
  starts_on!: string;

  @IsDateString()
  ends_on!: string;

  @IsOptional()
  @IsBoolean()
  is_current?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class CreateClassSectionDto {
  @IsString()
  academic_year_id!: string;

  @IsOptional()
  @IsString()
  academic_level_id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  grade_level?: string;

  @IsOptional()
  @IsString()
  stream?: string;

  @IsOptional()
  @IsString()
  custom_label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsIn(['CBC', 'CBE', '8-4-4', 'International', 'Hybrid', 'Custom'])
  curriculum_model?: string;

  @IsOptional()
  @IsBoolean()
  enrolment_open?: boolean;
}

export class CreateSubjectDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional()
  @IsString()
  abbreviation?: string;

  @IsOptional()
  @IsIn(['CBC', 'CBE', '8-4-4', 'International', 'Hybrid', 'Custom'])
  curriculum_model?: string;

  @IsOptional()
  @IsIn(['academic', 'learning_area', 'technical', 'co_curricular'])
  subject_type?: string;

  @IsOptional() @IsBoolean() is_compulsory?: boolean;
  @IsOptional() @IsBoolean() is_examinable?: boolean;
  @IsOptional() @IsBoolean() is_practical?: boolean;
  @IsOptional() @IsBoolean() is_co_curricular?: boolean;
}

export class AssignTeacherDto {
  @IsString()
  academic_term_id!: string;

  @IsString()
  class_section_id!: string;

  @IsString()
  subject_id!: string;

  @IsOptional()
  @IsString()
  stream_id?: string;

  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional()
  @IsString()
  curriculum_model?: string;

  @IsString()
  teacher_user_id!: string;

  @IsOptional()
  @IsIn(['primary', 'supporting', 'temporary'])
  assignment_type?: 'primary' | 'supporting' | 'temporary';

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @IsBoolean()
  mark_entry_allowed?: boolean;

  @IsOptional()
  @IsBoolean()
  lesson_record_allowed?: boolean;

  @IsOptional()
  @IsBoolean()
  report_comment_allowed?: boolean;

  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateClassStreamDto {
  @IsString()
  class_section_id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  stream_teacher_user_id?: string;
}

export type AcademicSystemType = 'CBC' | 'CBE' | '8-4-4' | 'International' | 'Hybrid' | 'Custom';

class StreamDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  class_teacher_id?: string;
}

class ClassDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  custom_label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StreamDto)
  streams?: StreamDto[];
}

class LevelDto {
  @IsString()
  name!: string;

  @IsInt()
  order_index!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassDto)
  classes!: ClassDto[];
}

export class CreateClassStructureDto {
  @IsString()
  system_type!: AcademicSystemType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LevelDto)
  levels!: LevelDto[];
}

export class AssignStudentToClassDto {
  @IsString()
  student_id!: string;

  @IsString()
  class_section_id!: string;

  @IsOptional()
  @IsString()
  stream_id?: string;

  @IsString()
  academic_level_id!: string;
  academic_year_id!: string;
}

export class CreateAttendanceDto {
  class_id!: string;
  attendance_date!: string;
  student_id!: string;
  status!: string;
}

export class CreateAssignmentDto {
  title!: string;
  description?: string;
  class_id!: string;
  subject_id!: string;
  due_date!: string;
  status?: string;
}

export class CreateResourceDto {
  title!: string;
  type!: string;
  url?: string;
  class_id!: string;
  subject_id!: string;
  status?: string;
}

export class CreateLessonLogDto {
  class_id!: string;
  subject_id!: string;
  topic!: string;
  notes?: string;
  date?: string;
}

export class UpdateAcademicYearDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  starts_on?: string;

  @IsOptional()
  @IsDateString()
  ends_on?: string;

  @IsOptional() @IsBoolean() is_current?: boolean;
  @IsOptional() @IsInt() @Min(0) display_order?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateAcademicTermDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  starts_on?: string;

  @IsOptional()
  @IsDateString()
  ends_on?: string;

  @IsOptional() @IsBoolean() is_current?: boolean;
  @IsOptional() @IsInt() @Min(0) display_order?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateClassSectionDto {
  @IsOptional()
  @IsString()
  academic_year_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  grade_level?: string;

  @IsOptional()
  @IsString()
  stream?: string;

  @IsOptional()
  @IsString()
  custom_label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsIn(['CBC', 'CBE', '8-4-4', 'International', 'Hybrid', 'Custom']) curriculum_model?: string;
  @IsOptional() @IsBoolean() enrolment_open?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional() @IsString() abbreviation?: string;
  @IsOptional() @IsIn(['CBC', 'CBE', '8-4-4', 'International', 'Hybrid', 'Custom']) curriculum_model?: string;
  @IsOptional() @IsIn(['academic', 'learning_area', 'technical', 'co_curricular']) subject_type?: string;
  @IsOptional() @IsBoolean() is_compulsory?: boolean;
  @IsOptional() @IsBoolean() is_examinable?: boolean;
  @IsOptional() @IsBoolean() is_practical?: boolean;
  @IsOptional() @IsBoolean() is_co_curricular?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateClassStreamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  class_section_id?: string;

  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() stream_teacher_user_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AcademicLifecycleDto {
  @IsIn(['activate', 'deactivate', 'close', 'archive', 'restore', 'delete'])
  action!: 'activate' | 'deactivate' | 'close' | 'archive' | 'restore' | 'delete';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;

  @IsOptional()
  @IsDateString()
  effective_at?: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;

  @IsOptional()
  @IsString()
  head_of_department_user_id?: string;

  @IsOptional()
  @IsIn(['permanent', 'acting'])
  appointment_type?: 'permanent' | 'acting';

  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;
}

export class AssignClassTeacherDto {
  @IsString()
  academic_year_id!: string;

  @IsString()
  class_section_id!: string;

  @IsString()
  teacher_user_id!: string;

  @IsOptional()
  @IsIn(['permanent', 'temporary'])
  assignment_type?: 'permanent' | 'temporary';

  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class EndAssignmentDto {
  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class CreateDepartmentDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() head_of_department_user_id?: string;
  @IsOptional() @IsIn(['permanent', 'acting']) appointment_type?: 'permanent' | 'acting';
  @IsOptional() @IsDateString() effective_from?: string;
  @IsOptional() @IsDateString() effective_to?: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CreateClassSubjectAssignmentDto {
  @IsString()
  academic_term_id!: string;

  @IsString()
  class_section_id!: string;

  @IsString()
  subject_id!: string;

  @IsOptional() @IsBoolean() is_compulsory?: boolean;
  @IsOptional() @IsBoolean() is_examinable?: boolean;
  @IsOptional() @IsDateString() effective_from?: string;
  @IsOptional() @IsDateString() effective_to?: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CreateBulkClassSubjectAssignmentsDto {
  @IsString()
  academic_term_id!: string;

  @IsString()
  class_section_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  subject_ids!: string[];

  @IsOptional() @IsBoolean() is_compulsory?: boolean;
  @IsOptional() @IsBoolean() is_examinable?: boolean;
  @IsOptional() @IsDateString() effective_from?: string;
  @IsOptional() @IsDateString() effective_to?: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class UpdateClassSubjectAssignmentDto {
  @IsOptional() @IsString() academic_term_id?: string;
  @IsOptional() @IsString() class_section_id?: string;
  @IsOptional() @IsString() subject_id?: string;
  @IsOptional() @IsBoolean() is_compulsory?: boolean;
  @IsOptional() @IsBoolean() is_examinable?: boolean;
  @IsOptional() @IsDateString() effective_from?: string;
  @IsOptional() @IsDateString() effective_to?: string;
  @IsOptional() @IsInt() @Min(1) expected_version?: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CreateAcademicCalendarPeriodDto {
  @IsString()
  academic_year_id!: string;

  @IsOptional() @IsString() academic_term_id?: string;
  @IsString() name!: string;
  @IsIn(['reporting', 'exam', 'holiday', 'activity', 'boarding', 'transport', 'other'])
  period_type!: 'reporting' | 'exam' | 'holiday' | 'activity' | 'boarding' | 'transport' | 'other';
  @IsDateString() starts_on!: string;
  @IsDateString() ends_on!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class UpdateAcademicCalendarPeriodDto {
  @IsOptional() @IsString() academic_year_id?: string;
  @IsOptional() @IsString() academic_term_id?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['reporting', 'exam', 'holiday', 'activity', 'boarding', 'transport', 'other'])
  period_type?: 'reporting' | 'exam' | 'holiday' | 'activity' | 'boarding' | 'transport' | 'other';
  @IsOptional() @IsDateString() starts_on?: string;
  @IsOptional() @IsDateString() ends_on?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsInt() @Min(1) expected_version?: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AcademicPolicyDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsObject() configuration?: Record<string, unknown>;
  @IsOptional() @IsArray() @ArrayMaxSize(100) rules?: Array<Record<string, unknown>>;
  @IsOptional() @IsDateString() effective_from?: string;
  @IsOptional() @IsDateString() effective_to?: string;
  @IsOptional() @IsString() grading_system_id?: string;
  @IsOptional() @IsBoolean() show_rank?: boolean;
  @IsOptional() @IsBoolean() show_attendance?: boolean;
  @IsOptional() @IsInt() @Min(1) expected_version?: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CreateAcademicPolicyDto extends AcademicPolicyDto {
  @IsString()
  declare name: string;
}

export class AcademicRoleAppointmentDto {
  @IsIn([
    'assistant_class_teacher', 'grade_master', 'form_master', 'dean_of_academics',
    'exams_manager', 'subject_coordinator', 'curriculum_coordinator',
    'academic_year_coordinator', 'timetable_coordinator',
  ])
  role_type!: string;

  @IsString()
  teacher_user_id!: string;

  @IsOptional() @IsString() department_id?: string;
  @IsOptional() @IsString() academic_year_id?: string;
  @IsOptional() @IsString() class_section_id?: string;
  @IsOptional() @IsString() stream_id?: string;
  @IsOptional() @IsIn(['permanent', 'acting', 'temporary']) appointment_type?: string;
  @IsDateString() effective_from!: string;
  @IsOptional() @IsDateString() effective_to?: string;
  @IsString() @MaxLength(500) reason!: string;
}

export class AcademicMergeDto {
  @IsString()
  target_id!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}

export class AcademicBulkLifecycleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @IsIn(['activate', 'deactivate', 'archive', 'restore'])
  action!: 'activate' | 'deactivate' | 'archive' | 'restore';

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class AcademicBulkDependencyPreviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];
}

export class AcademicCurriculumConfigurationDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['CBC', 'CBE', '8-4-4', 'International', 'Hybrid', 'Custom']) curriculum_model?: string;
  @IsOptional() @IsObject() configuration?: Record<string, unknown>;
  @IsOptional() @IsDateString() effective_from?: string;
  @IsOptional() @IsDateString() effective_to?: string;
  @IsOptional() @IsIn(['draft', 'active', 'future', 'inactive', 'archived']) status?: string;
  @IsOptional() @IsInt() @Min(1) expected_version?: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CreateAcademicCurriculumConfigurationDto extends AcademicCurriculumConfigurationDto {
  @IsString() declare name: string;
  @IsIn(['CBC', 'CBE', '8-4-4', 'International', 'Hybrid', 'Custom']) declare curriculum_model: string;
  @IsDateString() declare effective_from: string;
}

export class ReassignTeacherDto {
  @IsString() teacher_user_id!: string;
  @IsDateString() effective_from!: string;
  @IsString() @MaxLength(500) reason!: string;
  @IsOptional() @IsBoolean() transfer_future_timetable?: boolean;
  @IsOptional() @IsBoolean() transfer_pending_marks?: boolean;
  @IsOptional() @IsBoolean() transfer_assignments?: boolean;
  @IsOptional() @IsBoolean() transfer_comments?: boolean;
  @IsOptional() @IsBoolean() transfer_lesson_plans?: boolean;
  @IsOptional() @IsBoolean() transfer_pending_approvals?: boolean;
}
