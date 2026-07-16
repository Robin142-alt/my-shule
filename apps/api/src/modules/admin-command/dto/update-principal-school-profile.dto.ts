import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdatePrincipalSchoolProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  schoolName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  motto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  curriculum?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolType?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== '')
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  county?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subCounty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ward?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== '')
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  website?: string;
}
