import {
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Optional,
  Param,
  ParseUUIDPipe,
  Query,
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
import { createReportCardPdfArtifact, createBulkReportCardPdfBuffer, type BulkReportCardEntry } from './services/report-card-pdf-artifact';

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
      { includePrincipalSignature: reportCard.status === 'published' },
    );
    const pdfArtifact = await createReportCardPdfArtifact(renderPayload, verificationCode);

    return new StreamableFile(pdfArtifact.content, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdfArtifact.filename}"`,
    });
  }

  @Get('report-cards/bulk-download-pdf')
  @Permissions('exams:read')
  async bulkDownloadReportCards(
    @Query() query: Record<string, string | undefined>,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenant_id ?? req.user?.schoolId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for report-card downloads');
    }

    const studentIds = query.student_ids?.split(',').map(s => s.trim()).filter(Boolean);
    const reportCardIds = query.report_card_ids?.split(',').map(s => s.trim()).filter(Boolean);

    const cards = await this.examsRepository.listReportCardIdsForBulkDownload({
      tenant_id: tenantId,
      exam_series_id: query.exam_series_id?.trim() || undefined,
      class_section_id: query.class_section_id?.trim() || undefined,
      stream_id: query.stream_id?.trim() || undefined,
      student_ids: studentIds?.length ? studentIds : undefined,
      report_card_ids: reportCardIds?.length ? reportCardIds : undefined,
      limit: Math.min(Number(query.limit) || 200, 500),
    });

    if (!cards.length) {
      throw new NotFoundException('No report cards found in the selected scope for download');
    }

    const entries: BulkReportCardEntry[] = [];
    let schoolLogoPayload: Awaited<ReturnType<typeof hydrateReportCardLogoForRendering>> | null = null;

    for (const card of cards) {
      const payload = extractPersistedReportCardPayload(card.metadata);
      const verificationCode = String(card.verification_code ?? '').trim();
      if (!payload || !verificationCode) continue;

      if (!schoolLogoPayload) {
        schoolLogoPayload = await hydrateReportCardLogoForRendering(
          payload, tenantId, this.fileStorage,
          { includePrincipalSignature: card.status === 'published' },
        );
      }

      const renderPayload: typeof payload = {
        ...payload,
        template_fields: {
          ...payload.template_fields,
          school_logo_ref: schoolLogoPayload.template_fields.school_logo_ref,
          principal_signature_ref: card.status === 'published'
            ? payload.template_fields.principal_signature_ref
            : null,
        },
      };
      entries.push({ payload: renderPayload, verificationCode });
    }

    if (!entries.length) {
      throw new ConflictException(
        'None of the selected report cards have valid generated snapshots. Regenerate them before downloading.',
      );
    }

    const pdfBuffer = await createBulkReportCardPdfBuffer(entries);
    const filename = `report-cards-bulk-${entries.length}-${Date.now()}.pdf`;

    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
