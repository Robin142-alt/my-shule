import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const INVITABLE_ROLES = [
  'principal',
  'bursar',
  'accountant',
  'teacher',
  'dean_academics',
  'exams_manager',
  'hod',
  'class_teacher',
  'grade_master',
  'storekeeper',
  'transport_manager',
  'librarian',
  'parent',
  'admin',
] as const;

export class CreateInvitationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  display_name!: string;

  @IsEmail()
  email!: string;

  @IsIn(INVITABLE_ROLES)
  role!: (typeof INVITABLE_ROLES)[number];

  @IsOptional()
  @IsString()
  base_url?: string;
}
