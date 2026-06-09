import { IsString, IsNotEmpty } from 'class-validator';
import { SimpleOperationsRecordDto } from '../implementation100/simple-operations';

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

export class CreateVisitorDto implements SimpleOperationsRecordDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  category?: string;
  owner_name?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  metric_count?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}
