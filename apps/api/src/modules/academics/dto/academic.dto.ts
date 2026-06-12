import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  name!: string;

  @IsString()
  starts_on!: string;

  @IsString()
  ends_on!: string;
}

export class CreateAcademicTermDto {
  @IsString()
  academic_year_id!: string;

  @IsString()
  name!: string;

  @IsString()
  starts_on!: string;

  @IsString()
  ends_on!: string;
}

export class CreateClassSectionDto {
  @IsString()
  academic_year_id!: string;

  @IsOptional()
  @IsString()
  academic_level_id?: string;

  @IsString()
  name!: string;

  @IsString()
  grade_level!: string;

  @IsOptional()
  @IsString()
  stream?: string;

  @IsOptional()
  @IsString()
  custom_label?: string;

  @IsOptional()
  @IsInt()
  capacity?: number;
}

export class CreateSubjectDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;
}

export class AssignTeacherDto {
  @IsString()
  academic_term_id!: string;

  @IsString()
  class_section_id!: string;

  @IsString()
  subject_id!: string;

  @IsString()
  teacher_user_id!: string;
}

export type AcademicSystemType = 'CBC' | 'CBE' | '8-4-4' | 'International' | 'Custom';

class StreamDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
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
}

export class UpdateAcademicYearDto {
  name?: string;
  starts_on?: string;
  ends_on?: string;
}

export class UpdateAcademicTermDto {
  name?: string;
  starts_on?: string;
  ends_on?: string;
}

export class UpdateClassSectionDto {
  name?: string;
  grade_level?: string;
  stream?: string;
  custom_label?: string;
  capacity?: number;
}

export class UpdateSubjectDto {
  code?: string;
  name?: string;
}
