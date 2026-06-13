import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { IsOptional } from 'class-validator';

export class SyncPushOperationDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  op_id!: string;

  @IsString()
  entity!: string;

  @IsString()
  action!: string;

  @IsString()
  createdAtLocal!: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @IsObject()
  payload!: Record<string, unknown>;
}
