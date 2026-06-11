import { IsNotEmpty, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @IsOptional()
  @IsUUID()
  application_id?: string;

  @IsNotEmpty()
  @IsString()
  task_title!: string;

  @IsOptional()
  @IsString()
  task_description?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsUUID()
  assigned_user_id?: string;
}
