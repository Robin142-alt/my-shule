import { IsNotEmpty, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsOptional()
  @IsUUID()
  application_id?: string;

  @IsNotEmpty()
  @IsString()
  visitor_name!: string;

  @IsNotEmpty()
  @IsString()
  purpose!: string;

  @IsNotEmpty()
  @IsDateString()
  appointment_date!: string;

  @IsNotEmpty()
  @IsString()
  start_time!: string;

  @IsOptional()
  @IsUUID()
  assigned_user_id?: string;
}
