import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIMETABLE_VIEWS = ['class', 'teacher', 'resource', 'master'] as const;
const TIMETABLE_SCOPES = ['whole_school', 'class', 'teacher', 'requirement', 'unscheduled'] as const;
const PERIOD_KINDS = [
  'teaching',
  'break',
  'lunch',
  'assembly',
  'games',
  'clubs',
  'guidance_counselling',
  'class_meeting',
  'religious_activity',
  'prep',
  'remedial',
  'custom',
] as const;

function queryBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

class AcademicTermScopeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  academic_year!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  term_name!: string;
}

class TimetableScopedMutationDto extends AcademicTermScopeDto {
  @IsOptional()
  @IsString()
  version_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;

  /** Client alias for the timetable version's optimistic concurrency value. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;
}

export class TimetablePeriodConfigurationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  period_id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  short_name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  sequence?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(39)
  order_index?: number;

  @IsString()
  @Matches(TIME_PATTERN)
  starts_at!: string;

  @IsString()
  @Matches(TIME_PATTERN)
  ends_at!: string;

  @IsOptional()
  @IsIn(PERIOD_KINDS)
  kind?: (typeof PERIOD_KINDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  period_type?: string;

  @IsBoolean()
  is_teaching!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(360)
  duration_minutes?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class TimetableDayConfigurationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week!: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  is_teaching_day?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  order_index?: number;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => TimetablePeriodConfigurationDto)
  periods!: TimetablePeriodConfigurationDto[];
}

export class TimetableCommonBlockDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsIn(PERIOD_KINDS)
  activity_type!: (typeof PERIOD_KINDS)[number];

  @IsOptional()
  @IsIn(['whole_school', 'grade', 'class', 'stream'])
  applies_to?: 'whole_school' | 'grade' | 'class' | 'stream';

  @IsOptional()
  @IsIn(['school', 'grade', 'class', 'stream'])
  target_scope?: 'school' | 'grade' | 'class' | 'stream';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  target_ids?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week!: number;

  @IsString()
  period_id!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  duration_periods?: number;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @IsBoolean()
  is_locked?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ConfigureTimetableDto extends AcademicTermScopeDto {
  /** Canonical persisted shape. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => TimetableDayConfigurationDto)
  days?: TimetableDayConfigurationDto[];

  /** Backward-compatible client alias for days. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => TimetableDayConfigurationDto)
  teaching_days?: TimetableDayConfigurationDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(360)
  default_lesson_duration_minutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TimetableCommonBlockDto)
  common_blocks?: TimetableCommonBlockDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;
}

export class UpsertSubjectPeriodRequirementDto {
  @IsOptional()
  @IsString()
  requirement_id?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  class_section_id!: string;

  @IsOptional()
  @IsString()
  stream_id?: string;

  @IsString()
  subject_id!: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  /** Canonical persisted field. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  periods_per_week?: number;

  /** Legacy client alias for periods_per_week. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  weekly_periods?: number;

  @IsOptional()
  @IsIn(['single', 'double', 'extended', 'mixed'])
  lesson_pattern?: 'single' | 'double' | 'extended' | 'mixed';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  consecutive_periods?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  duration_periods?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  single_lessons?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  double_lessons?: number;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  parallel_key?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  preferred_days?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  preferred_period_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  preferred_start_period_ids?: string[];

  @IsOptional()
  @IsBoolean()
  avoid_last_period?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;
}

export class BulkUpsertRequirementsDto extends AcademicTermScopeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => UpsertSubjectPeriodRequirementDto)
  requirements!: UpsertSubjectPeriodRequirementDto[];

  @IsOptional()
  @IsBoolean()
  replace_existing?: boolean;
}

export class SetTeacherAvailabilityDto {
  @IsOptional()
  @IsString()
  availability_id?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  teacher_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week!: number;

  @IsOptional()
  @IsString()
  period_id?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  starts_at?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  ends_at?: string;

  @IsIn([
    'available',
    'prefer_free',
    'unavailable',
    'protected',
    'AVAILABLE',
    'PREFER_FREE',
    'UNAVAILABLE',
    'PROTECTED_ADMIN',
  ])
  state!:
    | 'available'
    | 'prefer_free'
    | 'unavailable'
    | 'protected'
    | 'AVAILABLE'
    | 'PREFER_FREE'
    | 'UNAVAILABLE'
    | 'PROTECTED_ADMIN';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;
}

export class BulkSetTeacherAvailabilityDto extends AcademicTermScopeDto {
  /** Canonical service field. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => SetTeacherAvailabilityDto)
  items?: SetTeacherAvailabilityDto[];

  /** Backward-compatible client alias for items. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => SetTeacherAvailabilityDto)
  availability?: SetTeacherAvailabilityDto[];

  @IsOptional()
  @IsBoolean()
  replace_existing?: boolean;
}

export class CreateTimetableResourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  resource_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  exclusive?: boolean;

  @IsOptional()
  @IsBoolean()
  is_exclusive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsIn(['active', 'inactive', 'archived'])
  status?: 'active' | 'inactive' | 'archived';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source_kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  source_record_id?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateTimetableResourceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  resource_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  exclusive?: boolean;

  @IsOptional()
  @IsBoolean()
  is_exclusive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsIn(['active', 'inactive', 'archived'])
  status?: 'active' | 'inactive' | 'archived';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version!: number;
}

export class CreateTimetableSlotDto extends AcademicTermScopeDto {
  @IsOptional()
  @IsString()
  requirement_id?: string;

  @IsString()
  class_section_id!: string;

  @IsOptional()
  @IsString()
  stream_id?: string;

  @IsString()
  subject_id!: string;

  @IsString()
  teacher_id!: string;

  /** Legacy room identifiers remain accepted while callers migrate to resource_id. */
  @IsOptional()
  @IsString()
  room_id?: string;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @IsString()
  period_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  parallel_key?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week!: number;

  @IsString()
  @Matches(TIME_PATTERN)
  starts_at!: string;

  @IsString()
  @Matches(TIME_PATTERN)
  ends_at!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  consecutive_periods?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  duration_periods?: number;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;
}

export class UpdateTimetableSlotDto extends CreateTimetableSlotDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;
}

export class PublishTimetableVersionDto extends AcademicTermScopeDto {
  @IsOptional()
  @IsString()
  version_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;

  /** Client alias for expected_version_row_version. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;

  @IsOptional()
  @IsBoolean()
  acknowledge_warnings?: boolean;
}

export class ReviseTimetableVersionDto extends PublishTimetableVersionDto {}

export class GenerateTimetableDto extends TimetableScopedMutationDto {
  @IsOptional()
  @IsIn(TIMETABLE_SCOPES)
  scope?: (typeof TIMETABLE_SCOPES)[number];

  @IsOptional()
  @IsIn(['school', 'class', 'stream', 'teacher', 'requirement'])
  scope_type?: 'school' | 'class' | 'stream' | 'teacher' | 'requirement';

  @IsOptional()
  @IsString()
  scope_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  class_section_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  teacher_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  requirement_ids?: string[];

  @IsOptional()
  @IsBoolean()
  preserve_locked?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_partial?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotency_key?: string;
}

export class ValidateTimetableDto extends AcademicTermScopeDto {
  @IsOptional()
  @IsString()
  version_id?: string;

  @IsOptional()
  @IsString()
  slot_id?: string;

  @IsOptional()
  @IsIn(TIMETABLE_SCOPES)
  scope?: (typeof TIMETABLE_SCOPES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  class_section_ids?: string[];

  @IsOptional()
  @IsBoolean()
  include_warnings?: boolean;

  @IsOptional()
  @IsObject()
  proposed_change?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;
}

export class TimetableViewQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  academic_year?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  term_name?: string;

  @IsOptional()
  @IsString()
  version_id?: string;

  @IsOptional()
  @IsIn(TIMETABLE_VIEWS)
  view?: (typeof TIMETABLE_VIEWS)[number];

  @IsOptional()
  @IsString()
  class_section_id?: string;

  @IsOptional()
  @IsString()
  stream_id?: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week?: number;

  @IsOptional()
  @Transform(({ value }) => queryBoolean(value))
  @IsBoolean()
  include_draft?: boolean;
}

export class FindValidSlotsDto extends AcademicTermScopeDto {
  @IsOptional()
  @IsString()
  version_id?: string;

  @IsOptional()
  @IsString()
  slot_id?: string;

  @IsOptional()
  @IsString()
  requirement_id?: string;

  @IsOptional()
  @IsString()
  unscheduled_id?: string;

  @IsOptional()
  @IsString()
  unscheduled_lesson_id?: string;

  @IsOptional()
  @IsString()
  class_section_id?: string;

  @IsOptional()
  @IsString()
  stream_id?: string;

  @IsOptional()
  @IsString()
  subject_id?: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  consecutive_periods?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  duration_periods?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  parallel_key?: string;

  @IsOptional()
  @IsBoolean()
  find_best?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;
}

export class MoveTimetableSlotDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  destination_day_of_week?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week?: number;

  @IsOptional()
  @IsString()
  period_id?: string;

  @IsOptional()
  @IsString()
  destination_period_id?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  starts_at?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  destination_starts_at?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  ends_at?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  destination_ends_at?: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @IsString()
  destination_resource_id?: string;

  @IsOptional()
  @IsString()
  room_id?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;
}

export class LockTimetableSlotDto {
  @IsBoolean()
  locked!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;
}

export class CancelTimetableSlotDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PlaceUnscheduledLessonDto {
  @IsOptional()
  @IsString()
  unscheduled_lesson_id?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week!: number;

  @IsString()
  period_id!: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version?: number;
}

export class CopyTimetableDto {
  @IsOptional()
  @IsString()
  source_version_id?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  source_academic_year?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  source_term_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  academic_year?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  term_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  target_academic_year?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  target_term_name?: string;

  @IsOptional()
  @IsBoolean()
  copy_requirements?: boolean;

  @IsOptional()
  @IsBoolean()
  copy_availability?: boolean;

  @IsOptional()
  @IsBoolean()
  preserve_locked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;
}

export class RegenerateTimetableDto extends TimetableScopedMutationDto {
  @IsOptional()
  @IsIn(TIMETABLE_SCOPES)
  scope?: (typeof TIMETABLE_SCOPES)[number];

  @IsOptional()
  @IsIn(['school', 'class', 'stream', 'teacher', 'requirement'])
  scope_type?: 'school' | 'class' | 'stream' | 'teacher' | 'requirement';

  @IsOptional()
  @IsString()
  scope_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  class_section_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  teacher_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  requirement_ids?: string[];

  @IsOptional()
  @IsBoolean()
  preserve_locked?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_partial?: boolean;

  @IsBoolean()
  confirm_scope!: boolean;
}

export class AutoFixTimetableDto extends TimetableScopedMutationDto {
  @IsOptional()
  @IsIn(TIMETABLE_SCOPES)
  scope?: (typeof TIMETABLE_SCOPES)[number];

  @IsOptional()
  @IsIn(['school', 'class', 'stream', 'teacher', 'requirement'])
  scope_type?: 'school' | 'class' | 'stream' | 'teacher' | 'requirement';

  @IsOptional()
  @IsString()
  scope_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  conflict_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  class_section_ids?: string[];

  @IsOptional()
  @IsBoolean()
  preserve_locked?: boolean;
}

export class TimetableHistoryQueryDto {
  @IsOptional()
  @IsString()
  academic_year?: string;

  @IsOptional()
  @IsString()
  term_name?: string;

  @IsOptional()
  @IsString()
  version_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ReliefAffectedQueryDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsOptional()
  @IsString()
  absent_teacher_id?: string;

  @IsOptional()
  @IsString()
  academic_year?: string;

  @IsOptional()
  @IsString()
  term_name?: string;
}

export class ReliefCandidatesQueryDto {
  @IsOptional()
  @IsString()
  timetable_slot_id?: string;

  @IsOptional()
  @IsString()
  slot_id?: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @Transform(({ value }) => queryBoolean(value))
  @IsBoolean()
  include_prefer_free?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AssignReliefDto {
  @IsOptional()
  @IsString()
  timetable_slot_id?: string;

  @IsOptional()
  @IsString()
  slot_id?: string;

  @IsOptional()
  @IsString()
  relief_teacher_id?: string;

  @IsOptional()
  @IsString()
  substitute_teacher_id?: string;

  @IsDateString()
  relief_date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  notify_teacher?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotency_key?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version_row_version?: number;
}

export class CancelReliefDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  cancellation_reason?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_row_version!: number;
}

export class TimetableExportQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  academic_year?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  term_name?: string;

  @IsOptional()
  @IsString()
  version_id?: string;

  @IsOptional()
  @IsIn(['pdf', 'csv'])
  format?: 'pdf' | 'csv';

  @IsOptional()
  @IsIn(TIMETABLE_VIEWS)
  view?: (typeof TIMETABLE_VIEWS)[number];

  @IsOptional()
  @IsString()
  class_section_id?: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week?: number;

  @IsOptional()
  @IsIn(['portrait', 'landscape'])
  orientation?: 'portrait' | 'landscape';
}

export class PortalTimetableQueryDto {
  @IsOptional()
  @IsString()
  academic_year?: string;

  @IsOptional()
  @IsString()
  term_name?: string;

  @IsOptional()
  @IsString()
  version_id?: string;

  @IsOptional()
  @IsString()
  student_id?: string;

  @IsOptional()
  @IsString()
  child_id?: string;

  @IsOptional()
  @IsString()
  class_section_id?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week?: number;
}
