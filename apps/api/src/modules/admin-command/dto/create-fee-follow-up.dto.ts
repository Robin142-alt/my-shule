import { Transform } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFeeFollowUpDto {
  @Transform(trim)
  @IsString()
  @IsIn(['student_arrears_reminder_requested', 'arrears_reminders_requested'])
  action!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  entity_id?: string;

  @Transform(trim)
  @IsString()
  @IsIn(['student_arrears'])
  entity_type!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(120)
  source_dashboard!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
