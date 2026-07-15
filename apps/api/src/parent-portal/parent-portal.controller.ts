import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { ParentPortalService } from './parent-portal.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ExamsService } from '../modules/exams/exams.service';

@Controller('parent')
export class ParentPortalController {
  constructor(
    private readonly service: ParentPortalService,
    private readonly examsService: ExamsService,
  ) {}

  @Get('overview')
  @Permissions('portal:read_own_children')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('academics')
  @Permissions('portal:read_own_children')
  getAcademics() {
    return this.service.getAcademics();
  }

  @Get('finance')
  @Permissions('portal:read_own_children')
  getFinance() {
    return this.service.getFinance();
  }

  @Get('communication')
  @Permissions('portal:read_own_children')
  getCommunication() {
    return this.service.getCommunication();
  }

  @Get('dashboard')
  @Permissions('portal:read_own_children')
  getDashboard(@Query('studentId') studentId?: string) {
    return this.service.getDashboardData(studentId);
  }

  @Get('children')
  @Permissions('portal:read_own_children')
  getChildren() {
    return this.service.getChildren();
  }

  @Get('report-cards')
  @Permissions('portal:read_own_children')
  getReportCards(@Query() query: Record<string, string | undefined>) {
    return this.examsService.listGuardianReportCards(query);
  }

  @Get('report-cards/:reportCardId/download')
  @Permissions('portal:read_own_children')
  async downloadReportCard(@Param('reportCardId') reportCardId: string, @Res({ passthrough: true }) res: any) {
    const artifact = await this.examsService.createGuardianReportCardPdfArtifact(reportCardId);

    res.set({
      'Content-Type': artifact.contentType,
      'Content-Disposition': `attachment; filename="${artifact.filename}"`,
      'Content-Length': String(artifact.byteLength),
    });

    return new StreamableFile(artifact.content);
  }
}
