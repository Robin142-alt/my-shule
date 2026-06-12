import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

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

  @IsNumber()
  score!: number;

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

  @IsNumber()
  score!: number;

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

  // You would typically use @Type and @ValidateNested for rows,
  // but to keep it simple if it's handled differently or needs validation
  rows!: BulkExamMarkUploadRowDto[];
}

export class CorrectLockedExamMarkDto {
  @IsString()
  mark_id!: string;

  @IsNumber()
  score!: number;

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

export class GenerateReportCardBatchDto {
  exam_series_id!: string;
  class_section_id?: string;
  stream_name?: string;
  batch_size?: number;
  offset?: number;
}

export class ModerateExamMarksDto {
  mark_ids!: string[];
  action!: 'approve' | 'return_for_correction';
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
