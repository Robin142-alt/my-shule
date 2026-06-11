import { IsNotEmpty, IsOptional, IsNumber, IsDateString, IsUUID } from 'class-validator';

export class CreateOfferDto {
  @IsNotEmpty()
  @IsUUID()
  application_id!: string;

  @IsOptional()
  @IsNumber()
  required_deposit?: number;

  @IsOptional()
  @IsDateString()
  offer_date?: string;

  @IsOptional()
  @IsDateString()
  deadline_date?: string;
}
