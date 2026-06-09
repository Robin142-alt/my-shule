import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SubmitLmsAssignmentDto {
  @IsUUID()
  student_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  answer_text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  attachment_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}
