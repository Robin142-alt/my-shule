import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateEnquiryDto {
  @IsNotEmpty()
  @IsString()
  enquiry_code!: string;

  @IsNotEmpty()
  @IsString()
  student_first_name!: string;

  @IsNotEmpty()
  @IsString()
  student_last_name!: string;

  @IsNotEmpty()
  @IsString()
  parent_name!: string;

  @IsNotEmpty()
  @IsString()
  parent_phone!: string;

  @IsOptional()
  @IsEmail()
  parent_email?: string;

  @IsOptional()
  @IsString()
  class_applying?: string;

  @IsOptional()
  @IsString()
  enquiry_source?: string;

  @IsOptional()
  @IsString()
  boarding_day_preference?: string;

  @IsOptional()
  @IsString()
  current_school?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  follow_up_date?: string;
}
