import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class UpdateStudentRecordDto {
  @IsString() @MinLength(1) @MaxLength(80) expected_updated_at!: string;
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(500) reason!: string;
  @Transform(trim) @IsOptional() @IsString() @MinLength(1) @MaxLength(80) first_name?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(80) middle_name?: string;
  @Transform(trim) @IsOptional() @IsString() @MinLength(1) @MaxLength(80) last_name?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(10) date_of_birth?: string;
  @IsOptional() @IsIn(['male', 'female', 'other', 'undisclosed']) gender?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(80) nationality?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(80) birth_certificate_number?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(80) upi_number?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(80) nemis_number?: string;
  @Transform(trim) @IsOptional() @IsString() @MinLength(1) @MaxLength(160) class_section_id?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(160) stream_id?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @ArrayUnique() @IsString({ each: true }) @MaxLength(160, { each: true }) subject_ids?: string[];
  @Transform(trim) @IsOptional() @IsString() @MaxLength(160) guardian_name?: string;
  @IsOptional() @IsIn(['', 'mother', 'father', 'guardian']) guardian_relationship?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(32) guardian_phone?: string;
}
