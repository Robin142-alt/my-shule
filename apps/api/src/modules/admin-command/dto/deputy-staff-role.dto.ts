import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class AssignDeputyStaffRoleDto {
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  staffId?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  staff_id?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  userId?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  user_id?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleCode?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  role_code?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleId?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  role_id?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;
}
