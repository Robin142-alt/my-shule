export class CreateExamSeriesDto {
  academic_term_id!: string;
  name!: string;
  starts_on!: string;
  ends_on!: string;
}

export class CreateExamAssessmentDto {
  exam_series_id!: string;
  subject_id!: string;
  name!: string;
  max_score!: number;
  weight!: number;
}

export class EnterExamMarkDto {
  exam_series_id!: string;
  assessment_id!: string;
  academic_term_id!: string;
  class_section_id!: string;
  subject_id!: string;
  student_id!: string;
  score!: number;
  remarks?: string;
}

export class BulkExamMarkUploadRowDto {
  row_number?: number;
  exam_series_id!: string;
  assessment_id!: string;
  academic_term_id!: string;
  class_section_id!: string;
  subject_id!: string;
  student_id!: string;
  score!: number;
  remarks?: string;
}

export class BulkExamMarkUploadDto {
  mode?: 'preview' | 'commit';
  preview_token?: string;
  rows!: BulkExamMarkUploadRowDto[];
}

export class CorrectLockedExamMarkDto {
  mark_id!: string;
  score!: number;
  reason!: string;
}

export class PublishReportCardDto {
  exam_series_id!: string;
  student_id!: string;
  report_snapshot_id!: string;
}

export class GenerateReportCardDto {
  exam_series_id!: string;
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
