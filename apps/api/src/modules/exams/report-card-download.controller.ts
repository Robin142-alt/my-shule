import { ReportCardExportService } from './services/report-card-export.service';
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
  Res,
  StreamableFile,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';
import { ExamsRepository } from './repositories/exams.repository';
import { isTenantScopedStoragePath } from './services/report-card-logo-hydration';
import { extractPersistedReportCardPayload } from './services/report-card-template.service';
import { ReportCardArtifactsService } from './services/report-card-artifacts.service';

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
    @Optional() private readonly artifacts?: ReportCardArtifactsService,
  ) {}

  @Get('report-cards/:reportCardId/download')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Permissions('exams:read')
  async downloadReportCard(
    @Param('reportCardId', new ParseUUIDPipe()) reportCardId: string,
    @Res({ passthrough:true }) res?: any,
  ) {
    this.examsService.assertReportCardScopeAccess();
    if (!this.artifacts) throw new ServiceUnavailableException('Report artifact storage is unavailable');
    const prepared=await this.artifacts.prepare(reportCardId);
    if ('download_url' in prepared && prepared.download_url?.startsWith('https://') && res) {
      res.redirect(302,prepared.download_url); return;
    }
    if (prepared.state!=='ready') throw new ConflictException('PDF preparation is queued. Use the report preparation endpoint to follow progress.');
    const pdfArtifact = await this.artifacts.read(reportCardId);

    return new StreamableFile(pdfArtifact.content, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdfArtifact.filename}"`,
    });
  }

  @Post('report-cards/:reportCardId/prepare-download')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Permissions('exams:read')
  prepareReportCard(@Param('reportCardId',new ParseUUIDPipe()) reportCardId:string) {
    this.examsService.assertReportCardScopeAccess();
    if (!this.artifacts) throw new ServiceUnavailableException('Report artifact storage is unavailable');
    return this.artifacts.prepare(reportCardId);
  }

  @Get('report-cards/jobs/:jobId')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Permissions('exams:read')
  reportJobStatus(@Param('jobId',new ParseUUIDPipe()) jobId:string) { return this.exports.status(jobId); }

  @Get('report-cards/jobs')
  @Header('Cache-Control','private, no-store')
  @Permissions('exams:read')
  recentJobs() { return this.exports.recent(); }

  @Post('report-cards/jobs/:jobId/retry')
  @Permissions('exams:read')
  retryJob(@Param('jobId',new ParseUUIDPipe()) jobId:string) { return this.exports.retry(jobId); }

  @Get('report-cards/:reportCardId/signatures/:signerRole')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Permissions('exams:read')
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
    if (this.artifacts) {
      const card=await this.artifacts.load(reportCardId);
      return { tenantId,payload:extractPersistedReportCardPayload(card.metadata)!,verificationCode:String(card.verification_code) };
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

    return { tenantId, payload, verificationCode };
  }

  @Get('report-cards/bulk-download-pdf')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Permissions('exams:read')
  async bulkDownloadReportCards(
    @Query() query: Record<string, string | undefined>,
    @Req() req: any,
  ) {
    // Kept as a compatibility entry point; large work never renders on an HTTP process.
    return this.exports.prepare(query);
  }

  @Post('report-cards/exports')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Permissions('exams:read')
  prepareExport(@Body() query: Record<string,string|undefined>) { return this.exports.prepare(query); }

  @Get('report-cards/exports/:jobId')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Permissions('exams:read')
  exportStatus(@Param('jobId') jobId: string) { return this.exports.status(jobId); }

  @Get('report-cards/exports/:jobId/download')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Permissions('exams:read')
  async downloadExport(@Param('jobId') jobId: string, @Res({ passthrough:true }) res?:any) {
    const prepared=await this.exports.status(jobId);
    if ('download_url' in prepared && prepared.download_url?.startsWith('https://') && res) {
      res.redirect(302,prepared.download_url); return;
    }
    const result = await this.exports.download(jobId);
    return new StreamableFile(result.stream, { type: 'application/pdf', disposition: 'attachment; filename="report-cards.pdf"' });
  }
}
