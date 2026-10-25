import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import type { ProgressionAction, ProgressionCommand } from '../../../../../shared/student-progression';
export class ProgressionSelectionDto {
  @IsString() @MinLength(1) @MaxLength(128) id!:string;
  @IsString() @MinLength(1) @MaxLength(128) expected_version!:string;
}
export class ProgressionCommandDto implements ProgressionCommand {
  @IsString() @MinLength(1) @MaxLength(128) request_id!:string;
  @IsIn(['hold','repeat','release','promote','place','subjects','reverse','transfer','expel','withdraw','reinstate']) action!:ProgressionAction;
  @IsString() @MinLength(1) @MaxLength(1000) reason!:string;
  @IsString() @MinLength(1) @MaxLength(128) academic_year_id!:string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>ProgressionSelectionDto) students!:ProgressionSelectionDto[];
  @IsOptional() @IsString() @MaxLength(128) target_class_section_id?:string;
  @IsOptional() @IsString() @MaxLength(128) target_stream_id?:string|null;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({each:true}) subject_ids?:string[];
  @IsOptional() @IsString() @MaxLength(128) transition_id?:string;
  @IsOptional() @IsString() @MaxLength(200) destination_school_name?:string;
}
export class ProgressionQueryDto {
  @IsOptional() @IsString() @MaxLength(128) academic_year_id?:string;
  @IsOptional() @IsString() @MaxLength(160) search?:string;
  @IsOptional() @IsString() @MaxLength(128) class_section_id?:string;
  @IsOptional() @IsString() @MaxLength(128) stream_id?:string;
  @IsOptional() @IsIn(['','upcoming','promoted','repeating','held','transferred','expelled','withdrawn','graduated','completed','enrolled','exception']) status?:string;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(100) limit?:number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(0) offset?:number;
}
export class ProgressionRunDto {
  @IsString() @MinLength(1) @MaxLength(128) academic_year_id!:string;
  @IsString() @MinLength(1) @MaxLength(128) request_id!:string;
}
export class ProgressionApprovalDto {
  @IsIn(['approved','rejected']) decision!:'approved'|'rejected';
  @IsString() @MinLength(1) @MaxLength(1000) reason!:string;
}
