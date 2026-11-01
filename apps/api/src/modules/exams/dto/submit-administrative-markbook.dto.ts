import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class SubmitAdministrativeMarkbookDto {
  @IsUUID() mark_entry_window_id!: string;
  @IsUUID() assessment_id!: string;
  @IsOptional() @IsUUID() teacher_user_id?: string | null;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1)
  @IsString({each:true}) @MaxLength(100,{each:true}) stream_ids!: string[];
  @IsString() @Matches(/^[a-f0-9]{32}$/) expected_revision!: string;
}
