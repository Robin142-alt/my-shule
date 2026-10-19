import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { StudentRecordsService } from './student-records.service';
import { UpdateStudentRecordDto } from './dto/update-student-record.dto';

@Controller('students')
@RequiresModule('students')
export class StudentRecordsController {
  constructor(private readonly records: StudentRecordsService) {}

  @Get(':studentId/record')
  @Permissions('students:read')
  get(@Param('studentId', new ParseUUIDPipe()) id: string) { return this.records.get(id); }

  @Get(':studentId/record/options')
  @Permissions('students:write')
  options(@Param('studentId', new ParseUUIDPipe()) id: string) { return this.records.options(id); }

  @Patch(':studentId/record')
  @Permissions('students:write')
  update(@Param('studentId', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStudentRecordDto) {
    return this.records.update(id, dto);
  }
}
