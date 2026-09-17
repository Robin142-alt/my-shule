import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class RegisterApplicationDto {
  @IsString()
  admission_number!: string;

  @IsString()
  class_name!: string;

  @IsString()
  stream_name!: string;

  @IsOptional()
  @IsString()
  dormitory_name?: string;

  @IsOptional()
  @IsString()
  transport_route?: string;
}

export class UploadApplicationDocumentDto {
  @IsString()
  document_type!: string;

  @IsOptional()
  @IsString()
  uploaded_by_user_id?: string;
}

export class UpdateDocumentVerificationDto {
  @IsString()
  @IsIn(['pending', 'verified', 'rejected'])
  verification_status!: string;
}

export class CreateAllocationDto {
  @IsString()
  class_name!: string;

  @IsString()
  stream_name!: string;

  @IsOptional()
  @IsString()
  dormitory_name?: string;

  @IsOptional()
  @IsString()
  transport_route?: string;

  @IsOptional()
  @IsString()
  effective_from?: string;
}

export class CreateTransferRecordDto {
  @IsOptional()
  @IsString()
  student_id?: string;

  @IsOptional()
  @IsString()
  application_id?: string;

  @IsString()
  transfer_type!: string;

  @IsString()
  school_name!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  requested_on?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdvanceAcademicLifecycleDto {
  @IsOptional() @IsString() request_id?: string;
  @IsOptional() @IsString() source_placement_id?: string;
  @IsOptional() @IsInt() @Min(1) expected_version?: number;
  @IsOptional() @IsString() target_class_section_id?: string;
  @IsOptional() @IsString() target_stream_id?: string | null;
  @IsString()
  @IsIn(['promotion', 'graduation', 'archive'])
  action!: 'promotion' | 'graduation' | 'archive';

  @IsOptional()
  @IsString()
  class_name?: string;

  @IsOptional()
  @IsString()
  stream_name?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CohortPromotionMappingDto {
  @IsString() @MaxLength(128) source_placement_id!: string;
  @IsInt() @Min(1) expected_version!: number;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5000) @ArrayUnique()
  @IsString({ each: true }) student_ids?: string[];
  @IsString() @MaxLength(128) target_class_section_id!: string;
  @IsOptional() @IsString() @MaxLength(128) target_stream_id?: string | null;
}

export class CohortPromotionCommandDto {
  @IsString() @MaxLength(128) request_id!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true })
  @Type(() => CohortPromotionMappingDto) mappings!: CohortPromotionMappingDto[];
  @IsString() @MaxLength(1000) reason!: string;
}
