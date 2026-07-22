import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateManualAdmissionDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  admission_number!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middle_name?: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name!: string;

  @Transform(trim)
  @IsIn(['male', 'female', 'other', 'undisclosed'])
  gender!: 'male' | 'female' | 'other' | 'undisclosed';

  @Transform(trim)
  @IsString()
  date_of_birth!: string;

  @Transform(trim)
  @IsString()
  admission_date!: string;

  @Transform(trim)
  @IsString()
  academic_year_id!: string;

  @Transform(trim)
  @IsString()
  curriculum!: string;

  @Transform(trim)
  @IsString()
  grade_level!: string;

  @Transform(trim)
  @IsString()
  class_section_id!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  stream_id?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  subject_ids!: string[];

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  guardian_name!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  guardian_relationship!: string;

  @Transform(trim)
  @IsString()
  guardian_phone!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  dormitory_name?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  transport_route?: string;
}
