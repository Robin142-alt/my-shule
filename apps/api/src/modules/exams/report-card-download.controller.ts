import {
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Optional,
  Param,
  ParseUUIDPipe,
  Req,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';
import { ExamsRepository } from './repositories/exams.repository';
import { hydrateReportCardLogoForRendering } from './services/report-card-logo-hydration';
import { extractPersistedReportCardPayload } from './services/report-card-template.service';
import { createReportCardPdfArtifact } from './services/report-card-pdf-artifact';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ReportCardDownloadController {
  constructor(
    private readonly examsRepository: ExamsRepository,
    @Optional() private readonly fileStorage?: DatabaseFileStorageService,
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
    const payload = extractPersistedReportCardPayload(reportCard.metadata);
    const verificationCode = String(reportCard.verification_code ?? '').trim();

    if (!payload || !verificationCode) {
      throw new ConflictException(
        'This report card has no valid generated snapshot. Regenerate it before previewing or downloading.',
      );
    }

    const renderPayload = await hydrateReportCardLogoForRendering(
      payload,
      tenantId,
      this.fileStorage,
    );
    const pdfArtifact = await createReportCardPdfArtifact(renderPayload, verificationCode);

    return new StreamableFile(pdfArtifact.content, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdfArtifact.filename}"`,
    });
  }
}
