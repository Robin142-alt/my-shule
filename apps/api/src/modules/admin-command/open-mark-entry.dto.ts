import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class OpenMarkEntryDto {
  @IsUUID() exam_series_id!: string;
  @IsIn(['teacher', 'class', 'everyone']) scope!: 'teacher' | 'class' | 'everyone';
  @IsOptional() @IsUUID() teacher_user_id?: string;
  @IsOptional() @IsUUID() class_section_id?: string;
  @IsISO8601({ strict: true }) closes_at!: string;
}
