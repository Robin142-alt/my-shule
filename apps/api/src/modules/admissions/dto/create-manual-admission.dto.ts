import { IsOptional, IsString } from 'class-validator';
import { CreateApplicationDto } from './create-application.dto';

export class CreateManualAdmissionDto extends CreateApplicationDto {
  @IsString()
  admission_number!: string;

  @IsString()
  stream_name!: string;

  @IsOptional()
  @IsString()
  dormitory_name?: string;

  @IsOptional()
  @IsString()
  transport_route?: string;
}
