import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const EXAM_SCORE_STATUSES = [
  'entered',
  'absent',
  'exempt',
  'not_assessed',
  'incomplete',
  'withheld',
  'medical_exception',
  'transfer_student',
] as const;

export type ExamScoreStatus = (typeof EXAM_SCORE_STATUSES)[number];

export const ACADEMIC_INTERVENTION_SOURCES = [
  'manual',
  'analytics',
  'moderation',
  'attendance',
  'reassessment',
] as const;

export const ACADEMIC_INTERVENTION_PRIORITIES = [
  'low',
  'normal',
  'high',
  'urgent',
] as const;

export const ACADEMIC_INTERVENTION_UPDATE_TYPES = [
  'progress',
  'assessment',
  'reassessment',
  'note',
  'status_change',
] as const;

export const ACADEMIC_INTERVENTION_STATUSES = [
  'planned',
  'active',
  'monitoring',
  'completed',
  'cancelled',
] as const;

export class CreateAcademicInterventionDto {
  @IsOptional()
  @IsIn(['school', 'department', 'subject', 'grade', 'class', 'assignment'])
  analytics_scope?: string;

  @IsOptional()
  @IsString()
  student_id?: string;

  @IsOptional()
  @IsString()
  exam_series_id?: string;

  @IsOptional()
  @IsString()
  subject_id?: string;

  @IsOptional()
  @IsString()
  class_section_id?: string;

  @IsOptional()
  @IsString()
  class_name?: string;

  @IsOptional()
  @IsString()
  subject_name?: string;

  @IsOptional()
  @IsString()
  owner_user_id?: string;

  @IsOptional()
  @IsString()
  owner_name?: string;

  @IsOptional()
  @IsString()
  hod_user_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(ACADEMIC_INTERVENTION_SOURCES)
  source?: (typeof ACADEMIC_INTERVENTION_SOURCES)[number];

  @IsString()
  trigger_reason!: string;

  @IsOptional()
  @IsObject()
  baseline?: Record<string, unknown>;

  @IsString()
  plan!: string;

  @IsOptional()
  @IsObject()
  target?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @IsIn(ACADEMIC_INTERVENTION_PRIORITIES)
  priority?: (typeof ACADEMIC_INTERVENTION_PRIORITIES)[number];

  @IsOptional()
  @IsString()
  starts_on?: string;

  @IsOptional()
  @IsString()
  due_on?: string;
}

export class AddAcademicInterventionUpdateDto {
  @IsOptional()
  @IsString()
  @IsIn(ACADEMIC_INTERVENTION_UPDATE_TYPES)
  update_type?: (typeof ACADEMIC_INTERVENTION_UPDATE_TYPES)[number];

  @IsString()
  notes!: string;

  @IsOptional()
  @IsNumber()
  score?: number | null;

  @IsOptional()
  @IsString()
  @IsIn(EXAM_SCORE_STATUSES)
  score_status?: ExamScoreStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @IsIn(ACADEMIC_INTERVENTION_STATUSES)
  status?: (typeof ACADEMIC_INTERVENTION_STATUSES)[number];

  @IsOptional()
  @IsObject()
  outcome?: Record<string, unknown>;
}

export class CreateExamSeriesDto {
  @IsString()
  academic_term_id!: string;

  @IsString()
  name!: string;

  @IsString()
  starts_on!: string;

  @IsString()
  ends_on!: string;
}

export class CreateExamAssessmentDto {
  @IsString()
  exam_series_id!: string;

  @IsString()
  subject_id!: string;

  @IsString()
  name!: string;

  @IsNumber()
  max_score!: number;

  @IsNumber()
  weight!: number;
}

export class EnterExamMarkDto {
  @IsString()
  exam_series_id!: string;

  @IsString()
  assessment_id!: string;

  @IsString()
  academic_term_id!: string;

  @IsString()
  class_section_id!: string;

  @IsString()
  subject_id!: string;

  @IsString()
  student_id!: string;

  @IsOptional()
  @IsNumber()
  score?: number | null;

  @IsOptional()
  @IsString()
  @IsIn(EXAM_SCORE_STATUSES)
  score_status?: ExamScoreStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkExamMarkUploadRowDto {
  @IsOptional()
  @IsInt()
  row_number?: number;

  @IsString()
  exam_series_id!: string;

  @IsString()
  assessment_id!: string;

  @IsString()
  academic_term_id!: string;

  @IsString()
  class_section_id!: string;

  @IsString()
  subject_id!: string;

  @IsString()
  student_id!: string;

  @IsOptional()
  @IsNumber()
  score?: number | null;

  @IsOptional()
  @IsString()
  @IsIn(EXAM_SCORE_STATUSES)
  score_status?: ExamScoreStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkExamMarkUploadDto {
  @IsOptional()
  @IsString()
  mode?: 'preview' | 'commit';

  @IsOptional()
  @IsString()
  preview_token?: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  // You would typically use @Type and @ValidateNested for rows,
  // but to keep it simple if it's handled differently or needs validation
  rows!: BulkExamMarkUploadRowDto[];
}

export class CorrectLockedExamMarkDto {
  @IsString()
  mark_id!: string;

  @IsOptional()
  @IsNumber()
  score?: number | null;

  @IsOptional()
  @IsString()
  @IsIn(EXAM_SCORE_STATUSES)
  score_status?: ExamScoreStatus;

  @IsString()
  reason!: string;
}

export class PublishReportCardDto {
  @IsString()
  exam_series_id!: string;

  @IsString()
  student_id!: string;

  @IsString()
  report_snapshot_id!: string;
}

export class GenerateReportCardDto {
  @IsString()
  exam_series_id!: string;

  @IsString()
  student_id!: string;
}

export class RegenerateReportCardDto extends GenerateReportCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class TransitionReportCardDto {
  @IsString()
  @IsIn(['submit', 'approve', 'recall', 'publish', 'unpublish'])
  action!: 'submit' | 'approve' | 'recall' | 'publish' | 'unpublish';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class UpdateReportCardCommentsDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  class_teacher_comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  principal_comment?: string;
}

export class GenerateReportCardBatchDto {
  @IsString()
  exam_series_id!: string;

  @IsOptional()
  @IsString()
  class_section_id?: string;

  @IsOptional()
  @IsString()
  stream_name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  batch_size?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ModerateExamMarksDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  mark_ids!: string[];

  @IsIn(['approve', 'return_for_correction'])
  action!: 'approve' | 'return_for_correction';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class LockExamMarksDto {
  mark_ids!: string[];
}

export class CreateTimetableSlotDto {
  exam_series_id!: string;
  assessment_id?: string;
  date!: string;
  start_time!: string;
  end_time!: string;
  room_name?: string;
}

export class AssignInvigilatorDto {
  timetable_slot_id!: string;
  staff_user_id!: string;
  role?: string;
}

export class MarkExamAttendanceDto {
  timetable_slot_id!: string;
  student_id!: string;
  status!: string;
  remarks?: string;
}

export class ReportStudentExamCaseDto {
  exam_series_id!: string;
  student_id!: string;
  case_type!: string;
  description!: string;
}

export class UpdateExamSettingsDto {
  lock_after_deadline?: boolean;
  grace_period_hours?: number;
  include_school_logo?: boolean;
  include_principal_signature?: boolean;
  include_official_stamp?: boolean;
  block_results_for_fee_balances?: boolean;
  fee_balance_block_threshold?: number;
  show_student_rank_to_parents?: boolean;
}
