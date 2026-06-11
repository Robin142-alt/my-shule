import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateTemplateDto {
  @IsNotEmpty()
  @IsString()
  template_name!: string;

  @IsNotEmpty()
  @IsString()
  template_type!: string;

  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
