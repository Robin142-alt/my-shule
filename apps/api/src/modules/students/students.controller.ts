import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { FeatureGate } from '../billing/decorators/feature-gate.decorator';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';
import { StudentsWidgetDataDto } from '../dashboard/dashboard.dto';

@Controller('students')
@FeatureGate('students')
@RequiresModule('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Post()
  @Permissions('students:write')
  async createStudent(@Body() dto: CreateStudentDto): Promise<StudentResponseDto> {
    return this.studentsService.createStudent(dto);
  }

  @Get()
  @Permissions('students:read')
  async listStudents(@Query() query: ListStudentsQueryDto): Promise<StudentResponseDto[]> {
    return this.studentsService.listStudents(query);
  }

  @Get(':studentId')
  @Permissions('students:read')
  async getStudent(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ): Promise<StudentResponseDto> {
    return this.studentsService.getStudent(studentId);
  }

  @Patch(':studentId')
  @Permissions('students:write')
  async updateStudent(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.updateStudent(studentId, dto);
  }

  @Get('summary/dashboard')
  @Permissions('students:read')
  async getSummary(): Promise<StudentsWidgetDataDto> {
    return this.studentsService.getSummary();
  }

  @Post('guardians')
  @Permissions('students:write')
  async createGuardian(@Body() body: any) {
    const store = this.requestContext.requireStore();
    return this.studentsService.createGuardian(
      store.tenant_id as string, 
      body.student_profile_id, 
      body.display_name, 
      body.relationship, 
      body.email, 
      body.phone
    );
  }

  @Get('guardians/directory')
  @Permissions('students:read')
  async listGuardians() {
    const store = this.requestContext.requireStore();
    return this.studentsService.listGuardians(store.tenant_id as string);
  }

  @Get(':studentId/guardians')
  @Permissions('students:read')
  async getStudentGuardians(@Param('studentId', new ParseUUIDPipe()) studentId: string) {
    const store = this.requestContext.requireStore();
    return this.studentsService.listGuardians(store.tenant_id as string);
  }
}
