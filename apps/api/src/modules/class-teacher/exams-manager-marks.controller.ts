import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClassTeacherService } from './class-teacher.service';
import { SaveTeacherMarksDto } from './dto/class-teacher.dto';

export class AssistedTeacherQuery {
  @IsOptional()
  @IsUUID()
  teacherUserId?: string;

  @IsOptional()
  @Transform(({value}) => Array.isArray(value) ? value : [value])
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({each:true})
  @MaxLength(100,{each:true})
  streamIds?: string[];
}

export class SaveAssistedMarksDto extends SaveTeacherMarksDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  streamIds?: string[];

  @IsUUID()
  declare examId: string;

  @IsUUID()
  declare classSectionId: string;

  @IsUUID()
  declare assessmentId: string;

  @IsOptional()
  @IsUUID()
  teacherUserId?: string;
}

@Controller('exams/assisted-marks-entry')
@RequiresModule('exams')
@Roles('exams_manager', 'exams_officer', 'exam_manager', 'exam_officer')
@Permissions('exams:write', 'exams:enter-marks')
export class ExamsManagerMarksController {
  constructor(private readonly service: ClassTeacherService) {}

  @Get('assignments')
  assignments() {
    return this.service.getAssistedMarkAssignments();
  }

  @Get('markbooks')
  markbooks(@Query() query: AssistedTeacherQuery) {
    return this.service.getAssistedMarkbooks(query.teacherUserId, query.streamIds);
  }

  @Post()
  save(@Body() body: SaveAssistedMarksDto) {
    return this.service.saveAssistedMarks(body.teacherUserId, body, body.streamIds);
  }
}
