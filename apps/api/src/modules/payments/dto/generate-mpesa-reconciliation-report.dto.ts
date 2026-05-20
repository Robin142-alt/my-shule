import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class GenerateMpesaReconciliationReportDto {
  @Transform(trim)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  report_date!: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  missing_callback_grace_minutes?: number;

  @Transform(trim)
  @IsOptional()
  @IsUUID()
  payment_channel_id?: string;
}

export class GenerateMpesaReconciliationRangeReportDto {
  @Transform(trim)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  start_date!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  end_date!: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  missing_callback_grace_minutes?: number;

  @Transform(trim)
  @IsOptional()
  @IsUUID()
  payment_channel_id?: string;
}

export class ListMpesaReconciliationReviewDto {
  @Transform(trim)
  @IsOptional()
  @IsIn([
    'verified_unmatched',
    'amount_mismatch',
    'duplicate_provider_receipt',
    'missing_provider_record',
    'reversed',
    'manual_review_required',
  ])
  reconciliation_state?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class RequestFinanceApprovalDto {
  @Transform(trim)
  @IsIn(['reversal', 'write_off', 'move_payment', 'post_after_mismatch'])
  action!: 'reversal' | 'write_off' | 'move_payment' | 'post_after_mismatch';

  @Transform(trim)
  @IsString()
  subject_type!: string;

  @Transform(trim)
  @IsUUID()
  subject_id!: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  amount_minor?: number;

  @Transform(trim)
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency_code?: string;

  @Transform(trim)
  @IsString()
  reason!: string;

  @Transform(trim)
  @IsOptional()
  @IsUUID()
  reconciliation_batch_id?: string;

  @Transform(trim)
  @IsOptional()
  @IsUUID()
  reconciliation_discrepancy_id?: string;

  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}
