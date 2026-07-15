import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { StudentPortalService } from './student-portal.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ExamsService } from '../exams/exams.service';

@Controller('student')
export class StudentController {
  constructor(
    private readonly studentPortalService: StudentPortalService,
    private readonly examsService: ExamsService,
  ) {}

  @Get('dashboard')
  @Permissions('student-portal:read')
  getStudentDashboard() {
    return this.studentPortalService.getDashboard();
  }

  @Get('overview')
  @Permissions('student-portal:read')
  getStudentOverview() {
    return this.studentPortalService.getOverview();
  }

  @Get('academics')
  @Permissions('student-portal:read')
  getStudentAcademics() {
    return this.studentPortalService.getAcademics();
  }

  @Get('attendance')
  @Permissions('student-portal:read')
  getStudentAttendance() {
    return this.studentPortalService.getAttendance();
  }

  @Get('report-cards')
  @Permissions('student-portal:read')
  getReportCards(@Query() query: Record<string, string | undefined>) {
    return this.examsService.listStudentPortalReportCards(query);
  }

  @Get('report-cards/:reportCardId/download')
  @Permissions('student-portal:read')
  async downloadReportCard(@Param('reportCardId') reportCardId: string, @Res({ passthrough: true }) res: any) {
    const artifact = await this.examsService.createStudentReportCardPdfArtifact(reportCardId);

    res.set({
      'Content-Type': artifact.contentType,
      'Content-Disposition': `attachment; filename="${artifact.filename}"`,
      'Content-Length': String(artifact.byteLength),
    });

    return new StreamableFile(artifact.content);
  }
}
