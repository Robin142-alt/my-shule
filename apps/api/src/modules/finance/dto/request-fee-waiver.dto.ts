import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RequestFeeWaiverDto {
  @Transform(trim)
  @IsUUID()
  student_id!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  student_name!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  class_name?: string;

  @Transform(trim)
  @IsString()
  @Matches(/^[1-9][0-9]*$/, {
    message: 'amount_minor must be a positive whole number of minor currency units',
  })
  amount_minor!: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
