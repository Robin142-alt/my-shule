import { IsNotEmpty, IsOptional, IsString, IsDateString, IsUUID, IsNumber } from 'class-validator';

export class CreateInterviewDto {
  @IsNotEmpty()
  @IsUUID()
  application_id!: string;

  @IsNotEmpty()
  @IsDateString()
  interview_date!: string;

  @IsNotEmpty()
  @IsString()
  start_time!: string;

  @IsNotEmpty()
  @IsString()
  end_time!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUUID()
  interviewer_user_id?: string;

  @IsOptional()
  @IsString()
  assessment_type?: string;

  @IsOptional()
  @IsNumber()
  reading_score?: number;

  @IsOptional()
  @IsNumber()
  writing_score?: number;

  @IsOptional()
  @IsNumber()
  mathematics_score?: number;

  @IsOptional()
  @IsString()
  general_conduct?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsString()
  interviewer_comment?: string;
}
