import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSecurityIncidentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  severity!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;
}

export class CreatePanicAlertDto {
  @IsString()
  @IsNotEmpty()
  location!: string;
}

export class CreateVisitorDto {
  @IsString()
  @IsNotEmpty()
  visitor_name!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  phone_number?: string;
  host_user_id?: string;
  badge_number?: string;
}
