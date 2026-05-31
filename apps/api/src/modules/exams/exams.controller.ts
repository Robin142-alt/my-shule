import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  BulkExamMarkUploadDto,
  CorrectLockedExamMarkDto,
  CreateExamAssessmentDto,
  CreateExamSeriesDto,
  EnterExamMarkDto,
  GenerateReportCardBatchDto,
  GenerateReportCardDto,
  PublishReportCardDto,
} from './dto/exams.dto';
import { ExamsService } from './exams.service';

@Controller('exams')
@RequiresModule('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post('series')
  @Permissions('exams:write')
  createSeries(@Body() dto: CreateExamSeriesDto) {
    return this.examsService.createSeries(dto);
  }

  @Post('assessments')
  @Permissions('exams:write')
  createAssessment(@Body() dto: CreateExamAssessmentDto) {
    return this.examsService.createAssessment(dto);
  }

  @Post('marks')
  @Permissions('exams:enter-marks')
  enterMark(@Body() dto: EnterExamMarkDto) {
    return this.examsService.enterMark(dto);
  }

  @Get('marks/bulk-template')
  @Permissions('exams:enter-marks')
  getBulkMarkUploadTemplate() {
    return this.examsService.getBulkMarkUploadTemplate();
  }

  @Post('marks/bulk-upload')
  @Permissions('exams:enter-marks')
  bulkUploadMarks(@Body() dto: BulkExamMarkUploadDto) {
    return this.examsService.bulkUploadMarks(dto);
  }

  @Patch('marks/corrections')
  @Permissions('exams:approve')
  correctLockedMark(@Body() dto: CorrectLockedExamMarkDto) {
    return this.examsService.correctLockedMark(dto);
  }

  @Post('report-cards/publish')
  @Permissions('exams:approve')
  publishReportCard(@Body() dto: PublishReportCardDto) {
    return this.examsService.publishReportCard(dto);
  }

  @Post('report-cards/generate')
  @Permissions('exams:approve')
  generateReportCard(@Body() dto: GenerateReportCardDto) {
    return this.examsService.generateReportCard(dto);
  }

  @Post('report-cards/regenerate')
  @Permissions('exams:approve')
  regenerateReportCard(@Body() dto: GenerateReportCardDto & { reason?: string }) {
    return this.examsService.regenerateReportCard(dto);
  }

  @Post('report-cards/batches')
  @Permissions('exams:approve')
  generateReportCardBatch(@Body() dto: GenerateReportCardBatchDto) {
    return this.examsService.generateReportCardBatch(dto);
  }

  @Get('report-cards/batches/:batchId')
  @Permissions('exams:read')
  getReportCardBatchStatus(@Param('batchId') batchId: string) {
    return this.examsService.getReportCardBatchStatus(batchId);
  }

  @Get('report-cards/verify/:verificationCode')
  @Permissions('exams:read')
  verifyReportCard(@Param('verificationCode') verificationCode: string) {
    return this.examsService.verifyReportCard(verificationCode);
  }

  @Get('report-cards')
  @Permissions('exams:read')
  listReportCards(@Query() query: Record<string, string | undefined>) {
    return this.examsService.listReportCards(query);
  }

  @Get('report-cards/:reportCardId/parent-download')
  @Permissions('portal:read_own_children')
  createParentReportCardDownload(@Param('reportCardId') reportCardId: string) {
    return this.examsService.createParentReportCardDownload(reportCardId);
  }

  @Get('report-cards/download/:token')
  @Permissions('portal:read_own_children')
  downloadParentReportCard(@Param('token') token: string) {
    return this.examsService.readParentReportCardDownloadToken(token);
  }

  @Get('mark-sheets')
  @Permissions('exams:read')
  listMarkSheets(@Query() query: Record<string, string | undefined>) {
    return this.examsService.listMarkSheets(query);
  }

  @Patch('mark-sheets/:markSheetId/lock')
  @Permissions('exams:enter-marks')
  lockMarkSheet(@Param('markSheetId') markSheetId: string) {
    return this.examsService.lockMarkSheet(markSheetId);
  }
}
