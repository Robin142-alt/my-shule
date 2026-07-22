import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { CreateManualAdmissionDto } from './create-manual-admission.dto';

export class BulkAdmissionRowDto extends CreateManualAdmissionDto {
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(501)
  row_number!: number;
}

export class BulkAdmissionCommitDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkAdmissionRowDto)
  rows!: BulkAdmissionRowDto[];
}
