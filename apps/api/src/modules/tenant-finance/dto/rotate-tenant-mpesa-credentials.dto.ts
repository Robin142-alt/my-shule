import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RotateTenantMpesaCredentialsDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  consumer_key?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  consumer_secret?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  passkey?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  callback_secret?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(128)
  initiator_name?: string;
}
