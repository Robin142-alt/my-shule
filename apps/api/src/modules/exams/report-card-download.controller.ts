import { randomUUID } from 'node:crypto';
import { ReportCardExportService } from './services/report-card-export.service';
import { createReadStream } from 'node:fs';
import { ExamsService } from './exams.service';
import {
  ConflictException,
  Post,
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Optional,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
  Req,
  StreamableFile,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';
import { ExamsRepository } from './repositories/exams.repository';
import { hydrateReportCardLogoForRendering, isTenantScopedStoragePath } from './services/report-card-logo-hydration';
import { extractPersistedReportCardPayload } from './services/report-card-template.service';
import { createReportCardPdfArtifact } from './services/report-card-pdf-artifact';

enum ReportCardSignatureRole {
  ClassTeacher = 'class_teacher',
  Principal = 'principal',
}

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ReportCardDownloadController {
  constructor(
    private readonly examsRepository: ExamsRepository,
    private readonly examsService: ExamsService,
    private readonly exports: ReportCardExportService,
    @Optional() private readonly fileStorage?: DatabaseFileStorageService,
  ) {}

  @Get('report-cards/:reportCardId/download')
  @Permissions('exams:read')
  async downloadReportCard(
    @Param('reportCardId', new ParseUUIDPipe()) reportCardId: string,
  ) {
    const { payload, tenantId, verificationCode } = await this.loadReportCardSnapshot(reportCardId);
    const renderPayload = await hydrateReportCardLogoForRendering(payload, tenantId, this.fileStorage);
    const pdfArtifact = await createReportCardPdfArtifact(renderPayload, verificationCode);

    return new StreamableFile(pdfArtifact.content, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdfArtifact.filename}"`,
    });
  }

  @Get('report-cards/:reportCardId/signatures/:signerRole')
  @Permissions('exams:read')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async readReportCardSignature(
    @Param('reportCardId', new ParseUUIDPipe()) reportCardId: string,
    @Param('signerRole', new ParseEnumPipe(ReportCardSignatureRole)) signerRole: ReportCardSignatureRole,
  ) {
    const { payload, tenantId } = await this.loadReportCardSnapshot(reportCardId);
    const field = signerRole === ReportCardSignatureRole.ClassTeacher
      ? 'class_teacher_signature_ref' : 'principal_signature_ref';
    const storagePath = payload.template_fields[field]?.trim() ?? '';
    if (!isTenantScopedStoragePath(tenantId, storagePath)) {
      throw new NotFoundException('This report-card snapshot has no saved signature for this signer. Upload the signature and regenerate the report card.');
    }
    if (!this.fileStorage) {
      throw new ServiceUnavailableException('Signature file storage is not available. Retry loading the signature.');
    }
    const image = await this.fileStorage.readForTenant({ tenantId, storagePath });
    if (image.stored_path !== storagePath || !/^image\/(?:png|jpe?g)$/i.test(image.mime_type)) {
      throw new NotFoundException('The saved report-card signature could not be read. Upload it again and regenerate the report card.');
    }
    return new StreamableFile(image.content, {
      type: image.mime_type,
      disposition: 'inline',
      length: image.content.length,
    });
  }

  private async loadReportCardSnapshot(reportCardId: string) {
    const tenantId = this.examsService.assertReportCardScopeAccess();

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

    return { tenantId, payload, verificationCode };
  }

  @Get('report-cards/bulk-download-pdf')
  @Permissions('exams:read')
  async bulkDownloadReportCards(
    @Query() query: Record<string, string | undefined>,
    @Req() req: any,
  ) {
    const artifact = await this.exports.generate(query, undefined, () => req.aborted);
    try {
      await this.exports.recordExport(artifact.cardIds, artifact.scope, artifact.count, randomUUID());
      const stream = createReadStream(artifact.path);
      stream.once('close', () => { void artifact.cleanup(); });
      return new StreamableFile(stream, { type: 'application/pdf', disposition: 'attachment; filename="report-cards.pdf"' });
    } catch(error) { await artifact.cleanup(); throw error; }
  }

  @Post('report-cards/exports')
  @Permissions('exams:read')
  prepareExport(@Body() query: Record<string,string|undefined>) { return this.exports.prepare(query); }

  @Get('report-cards/exports/:jobId')
  @Permissions('exams:read')
  exportStatus(@Param('jobId') jobId: string) { return this.exports.status(jobId); }

  @Get('report-cards/exports/:jobId/download')
  @Permissions('exams:read')
  async downloadExport(@Param('jobId') jobId: string) {
    const result = await this.exports.download(jobId);
    return new StreamableFile(result.stream, { type: 'application/pdf', disposition: 'attachment; filename="report-cards.pdf"' });
  }
}
