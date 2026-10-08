import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../password-policy';

export class AcceptInvitationDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  display_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  expected_tenant_id?: string;
}

export class InvitationAcceptanceResponseDto {
  success!: true;
  message!: string;
  tenant_id!: string;
  email!: string;
  display_name!: string;
  role!: string;
}
