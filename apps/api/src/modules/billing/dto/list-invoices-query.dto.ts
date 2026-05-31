import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ListInvoicesQueryDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'open', 'pending_payment', 'paid', 'void', 'uncollectible'])
  status?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ListStudentBalancesQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
