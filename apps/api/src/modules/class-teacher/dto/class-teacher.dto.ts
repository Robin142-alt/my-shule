import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

import type { ExamScoreStatus } from '../../exams/dto/exams.dto';

export interface TeacherMarkInput {
  score?: number | string | null;
  score_status?: ExamScoreStatus;
  remarks?: string;
}

export class SaveTeacherMarksDto {
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'submit'])
  action?: 'draft' | 'submit';

  @IsString()
  examId!: string;

  @IsString()
  classSectionId!: string;

  @IsOptional()
  @IsString()
  assessmentId?: string;

  @IsOptional()
  @IsObject()
  marks?: Record<string, TeacherMarkInput>;

  // Backward-compatible fields for existing clients. New clients should use marks.
  @IsOptional()
  @IsObject()
  scores?: Record<string, number | string | null>;

  @IsOptional()
  @IsObject()
  remarks?: Record<string, string>;
}
