import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SyllabusService } from './syllabus.service';

@Controller('academics/syllabus')
@RequiresModule('academics')
@Permissions('academics:read')
export class SyllabusController {
  constructor(private readonly syllabus: SyllabusService) {}
  @Get() workspace() { return this.syllabus.workspace(); }
  @Post() create(@Body() input: unknown) { return this.syllabus.save(input); }
  @Patch(':id') update(@Param('id') id: string, @Body() input: unknown) { return this.syllabus.save(input, id); }
  @Post(':id/subtopics/:subtopicId/coverage') coverage(@Param('id') id: string, @Param('subtopicId') subtopicId: string, @Body() input: unknown) {
    return this.syllabus.recordCoverage(id, subtopicId, input);
  }
  @Post('export') exportReport() { return this.syllabus.exportReport(); }
}
