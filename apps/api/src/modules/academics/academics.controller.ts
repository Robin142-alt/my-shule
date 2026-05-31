import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { AcademicsService } from './academics.service';
import {
  AssignTeacherDto,
  AssignStudentToClassDto,
  CreateAcademicTermDto,
  CreateAcademicYearDto,
  CreateClassSectionDto,
  CreateClassStructureDto,
  CreateSubjectDto,
} from './dto/academic.dto';

@Controller('academics')
@RequiresModule('academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post('years')
  @Permissions('academics:write')
  createAcademicYear(@Body() dto: CreateAcademicYearDto) {
    return this.academicsService.createAcademicYear(dto);
  }

  @Post('terms')
  @Permissions('academics:write')
  createAcademicTerm(@Body() dto: CreateAcademicTermDto) {
    return this.academicsService.createAcademicTerm(dto);
  }

  @Post('class-sections')
  @Permissions('academics:write')
  createClassSection(@Body() dto: CreateClassSectionDto) {
    return this.academicsService.createClassSection(dto);
  }

  @Post('class-structure')
  @Permissions('academics:write')
  createClassStructure(@Body() dto: CreateClassStructureDto) {
    return this.academicsService.createClassStructure(dto);
  }

  @Post('subjects')
  @Permissions('academics:write')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.academicsService.createSubject(dto);
  }

  @Post('teacher-assignments')
  @Permissions('academics:assign-teachers')
  assignTeacher(@Body() dto: AssignTeacherDto) {
    return this.academicsService.assignTeacher(dto);
  }

  @Post('student-class-assignments')
  @Permissions('students:write', 'academics:write')
  assignStudentToClass(@Body() dto: AssignStudentToClassDto) {
    return this.academicsService.assignStudentToClass(dto);
  }

  @Get('teacher-assignments')
  @Permissions('academics:read')
  listTeacherAssignments(
    @Query('teacher_user_id') teacherUserId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.academicsService.listTeacherAssignments(teacherUserId, limit, offset);
  }
}
