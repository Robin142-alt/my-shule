import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class LegalSelectionDto {
  @IsString() @MaxLength(80) document_id!: string;
  @IsBoolean() checked!: boolean;
}
export class AcceptLegalDto {
  @IsArray() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => LegalSelectionDto)
  selections!: LegalSelectionDto[];
}
export class GuardianLegalDto extends AcceptLegalDto {
  @IsString() @MinLength(1) @MaxLength(100) student_id!: string;
  @IsBoolean() checked!: boolean;
}
export class WithdrawGuardianDto {
  @IsString() @MinLength(1) @MaxLength(100) student_id!: string;
  @IsBoolean() checked!: boolean;
}
export class RevokeAuthorityDto {
  @IsString() @MinLength(1) @MaxLength(100) school_id!: string;
  @IsBoolean() checked!: boolean;
}
export class VerifyAuthorityDto {
  @IsIn(['school','guardian']) kind!: 'school' | 'guardian';
  @IsString() @MinLength(1) @MaxLength(100) school_id!: string;
  @IsUUID() user_id!: string;
  @IsOptional() @IsString() @MaxLength(100) student_id?: string;
  @IsString() @MinLength(8) @MaxLength(500) evidence_reference!: string;
  @IsBoolean() checked!: boolean;
}
