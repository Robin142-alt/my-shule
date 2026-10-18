import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTeacherHomeworkDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsString() @MinLength(1) classId!: string;
  @IsString() @MinLength(1) subjectId!: string;
  @IsOptional() @IsString() streamId?: string;
  @IsISO8601() dueDate!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(10000) maxScore?: number;
}

export class ReviewTeacherSubmissionDto {
  @IsString() @MinLength(1) studentId!: string;
  @IsIn(['submitted', 'graded', 'returned']) status!: 'submitted' | 'graded' | 'returned';
  @IsOptional() @IsNumber() @Min(0) @Max(10000) score?: number;
  @IsOptional() @IsString() @MaxLength(5000) feedback?: string;
  @IsOptional() @IsISO8601() expectedUpdatedAt?: string;
}

export class RaiseTeacherConcernDto {
  @IsString() @MinLength(1) studentId!: string;
  @IsUUID() categoryId!: string;
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsString() @MinLength(1) @MaxLength(10000) description!: string;
  @IsIn(['low', 'medium', 'high', 'critical']) severity!: 'low' | 'medium' | 'high' | 'critical';
}

export class RecordTeacherLessonDto {
  @IsString() @MinLength(1) classId!: string;
  @IsString() @MinLength(1) subjectId!: string;
  @IsOptional() @IsString() streamId?: string;
  @IsOptional() @IsISO8601() date?: string;
  @IsIn(['taught', 'not_taught']) lessonStatus!: 'taught' | 'not_taught';
  @IsOptional() @IsString() @MaxLength(10000) topics?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsString() @MaxLength(5000) challenges?: string;
}
