import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteExamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  confirmation_name!: string;
}
