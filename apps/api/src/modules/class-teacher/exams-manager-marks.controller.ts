import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClassTeacherService } from './class-teacher.service';
import { SaveTeacherMarksDto } from './dto/class-teacher.dto';

export class AssistedTeacherQuery {
  @IsUUID()
  teacherUserId!: string;
}

export class SaveAssistedMarksDto extends SaveTeacherMarksDto {
  @IsUUID()
  declare examId: string;

  @IsUUID()
  declare classSectionId: string;

  @IsUUID()
  declare assessmentId: string;

  @IsUUID()
  teacherUserId!: string;
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
    return this.service.getAssistedMarkbooks(query.teacherUserId);
  }

  @Post()
  save(@Body() body: SaveAssistedMarksDto) {
    return this.service.saveAssistedMarks(body.teacherUserId, body);
  }
}
