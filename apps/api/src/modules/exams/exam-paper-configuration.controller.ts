import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ExamPaperConfigurationService, type PaperConfigurationInput } from './exam-paper-configuration.service';

@Controller('exams/markbooks')
@RequiresModule('exams')
export class ExamPaperConfigurationController {
  constructor(private readonly papers: ExamPaperConfigurationService) {}

  @Get(':windowId/papers')
  @Permissions('exams:enter-marks')
  read(@Param('windowId', ParseUUIDPipe) windowId: string) { return this.papers.read(windowId); }

  @Post(':windowId/papers')
  @Permissions('exams:enter-marks')
  save(@Param('windowId', ParseUUIDPipe) windowId: string, @Body() body: PaperConfigurationInput) { return this.papers.save(windowId, body); }
}
