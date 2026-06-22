import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards, StreamableFile, InternalServerErrorException } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ReportCardGenerationService } from './services/report-card-generation.service';
import { ExamsRepository } from './repositories/exams.repository';
import { ReportCardTemplateService } from './services/report-card-template.service';
import { createReportCardPdfArtifact } from './services/report-card-pdf-artifact';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ReportCardDownloadController {
  constructor(
    private readonly reportCardGenerationService: ReportCardGenerationService,
    private readonly examsRepository: ExamsRepository,
    private readonly templateService: ReportCardTemplateService,
  ) {}

  @Get('report-cards/:reportCardId/download')
  @Permissions('exams:read')
  async downloadReportCard(
    @Param('reportCardId', new ParseUUIDPipe()) reportCardId: string,
    @Req() req: any
  ) {
    const { schoolId, userId } = req.user;

    // Load report card metadata to get student_id and exam_series_id
    const result = await this.examsRepository.executeSql(
      `SELECT * FROM generated_report_cards WHERE id = $1 AND tenant_id = $2`,
      [reportCardId, schoolId]
    );

    if (result.rowCount === 0) {
      throw new InternalServerErrorException('Report card not found');
    }

    const reportCard = result.rows[0];
    
    const data = await this.examsRepository.loadReportCardData({
      tenant_id: schoolId,
      exam_series_id: reportCard.exam_series_id,
      student_id: reportCard.student_id,
    });
    
    const payload = this.templateService.buildPayload(data, reportCard.metadata?.generated_at || new Date().toISOString());
    const pdfArtifact = await createReportCardPdfArtifact(payload, reportCard.verification_code);

    return new StreamableFile(pdfArtifact.content, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdfArtifact.filename}"`,
    });
  }
}
