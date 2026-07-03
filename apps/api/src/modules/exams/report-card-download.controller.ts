import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards, StreamableFile, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ExamsRepository } from './repositories/exams.repository';
import { ReportCardTemplateService } from './services/report-card-template.service';
import { createReportCardPdfArtifact } from './services/report-card-pdf-artifact';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ReportCardDownloadController {
  constructor(
    private readonly examsRepository: ExamsRepository,
    private readonly templateService: ReportCardTemplateService,
  ) {}

  @Get('report-cards/:reportCardId/download')
  @Permissions('exams:read')
  async downloadReportCard(
    @Param('reportCardId', new ParseUUIDPipe()) reportCardId: string,
    @Req() req: any
  ) {
    const tenantId = req.user?.tenant_id ?? req.user?.schoolId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for report-card downloads');
    }

    const result = await this.examsRepository.executeSql(
      `SELECT * FROM student_report_cards WHERE tenant_id = $1 AND id = $2::uuid`,
      [tenantId, reportCardId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Report card not found for this school');
    }

    const reportCard = result.rows[0];
    
    const data = await this.examsRepository.loadReportCardData({
      tenant_id: tenantId,
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
