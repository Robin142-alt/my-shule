export class CreateAcademicYearDto {
  name!: string;
  starts_on!: string;
  ends_on!: string;
}

export class CreateAcademicTermDto {
  academic_year_id!: string;
  name!: string;
  starts_on!: string;
  ends_on!: string;
}

export class CreateClassSectionDto {
  academic_year_id!: string;
  academic_level_id?: string;
  name!: string;
  grade_level!: string;
  stream?: string;
  custom_label?: string;
  capacity?: number;
}

export class CreateSubjectDto {
  code!: string;
  name!: string;
}

export class AssignTeacherDto {
  academic_term_id!: string;
  class_section_id!: string;
  subject_id!: string;
  teacher_user_id!: string;
}

export type AcademicSystemType = 'CBC' | 'CBE' | '8-4-4' | 'International' | 'Custom';

export class CreateClassStructureDto {
  system_type!: AcademicSystemType;
  levels!: Array<{
    name: string;
    order_index: number;
    classes: Array<{
      name: string;
      custom_label?: string;
      capacity?: number;
      streams?: Array<{
        name: string;
        capacity?: number;
        class_teacher_id?: string;
      }>;
    }>;
  }>;
}

export class AssignStudentToClassDto {
  student_id!: string;
  class_section_id!: string;
  stream_id?: string;
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
