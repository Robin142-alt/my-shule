import { Body, Controller, Get, Post, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';

@Controller('academic')
@RequiresModule('academics')
export class AcademicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService
  ) {}

  @Get('communications')
  @Permissions('academics:read')
  async getCommunications() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await this.prisma.communicationBroadcast.findMany({
        where: { schoolId: tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Post('dean/lock-batch')
  @Permissions('academics:write')
  async lockBatch(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const batchId = body.batchId || body.id;
    if (batchId) {
      try {
        await this.prisma.reportCardGenerationBatches.updateMany({
          where: { id: batchId, tenant_id: tenantId },
          data: { status: 'LOCKED' }
        });
      } catch (e: any) {
        console.error('academic.controller error:', e);
        throw new InternalServerErrorException(e.message);
      }
    }
    return { success: true };
  }

  @Post('dean/action')
  @Permissions('academics:write')
  async deanAction(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    if (body.taskId) {
      try {
        await this.prisma.workflowTask.updateMany({
          where: { id: body.taskId, schoolId: tenantId },
          data: { status: body.action === 'approve' ? 'DONE' : 'CANCELLED' }
        });
      } catch (e: any) {
        console.error('academic.controller error:', e);
        throw new InternalServerErrorException(e.message);
      }
    }
    return { success: true };
  }

  @Post('exams-manager/import-marks')
  @Permissions('academics:write')
  async importMarks(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const { marks } = body;
    if (Array.isArray(marks)) {
      for (const m of marks) {
        try {
          await this.prisma.examMarks.create({
            data: {
              academic_term_id: m.academicTermId || m.academic_term_id,
              assessment_id: m.assessmentId || m.assessment_id,
              class_section_id: m.classSectionId || m.class_section_id,
              entered_by_user_id: m.enteredByUserId || m.entered_by_user_id || '00000000-0000-0000-0000-000000000000',
              exam_series_id: m.examSeriesId || m.exam_series_id,
              score: m.score,
              student_id: m.studentId || m.student_id,
              subject_id: m.subjectId || m.subject_id,
              tenant_id: tenantId,
              remarks: m.remarks || '',
              updated_by_user_id: m.updatedByUserId || m.updated_by_user_id || '00000000-0000-0000-0000-000000000000',
              status: 'draft',
            }
          });
        } catch (e: any) {
          console.error('academic.controller error:', e);
          throw new InternalServerErrorException(e.message);
        }
      }
    }
    return { success: true };
  }

  @Get('exams-manager/export-marks')
  @Permissions('academics:read')
  async exportMarks() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await this.prisma.examMarks.findMany({
        where: { tenant_id: tenantId }
      });
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Post('exams-manager/zeraki-sync')
  @Permissions('academics:write')
  async syncZeraki(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const count = await this.prisma.examMarks.count({
        where: { tenant_id: tenantId }
      });
      return { success: true, count };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Post('grade-master/compile')
  @Permissions('academics:write')
  async compileGrades(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const { studentId, examSeriesId } = body;
    if (studentId && examSeriesId) {
      try {
        await this.prisma.studentReportCards.updateMany({
          where: { student_id: studentId, exam_series_id: examSeriesId, tenant_id: tenantId },
          data: { status: 'compiled' }
        });
      } catch (e: any) {
        console.error('academic.controller error:', e);
        throw new InternalServerErrorException(e.message);
      }
    }
    return { success: true };
  }

  @Post('grade-master/comment')
  @Permissions('academics:write')
  async addComment(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const { reportCardId, comment } = body;
    if (reportCardId) {
      try {
        const rc = await this.prisma.studentReportCards.findFirst({
          where: { id: reportCardId, tenant_id: tenantId }
        });
        if (rc) {
          let metadataObj = typeof rc.metadata === 'string' ? JSON.parse(rc.metadata) : rc.metadata;
          if (!metadataObj || typeof metadataObj !== 'object') {
            metadataObj = {};
          }
          metadataObj['comment'] = comment;
          await this.prisma.studentReportCards.update({
            where: { id: reportCardId },
            data: { metadata: metadataObj }
          });
        }
      } catch (e: any) {
        console.error('academic.controller error:', e);
        throw new InternalServerErrorException(e.message);
      }
    }
    return { success: true };
  }

  @Get('hod/requests')
  @Permissions('academics:read')
  async getHodRequests() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await this.prisma.approvalRequest.findMany({
        where: { schoolId: tenantId }
      });
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Get('hod/subject-allocation')
  @Permissions('academics:read')
  async getSubjectAllocation() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new Error('Tenant ID required');
    try {
      const items = await this.prisma.subject.findMany({
        where: { schoolId: tenantId as string }
      });
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Get('hod/department-meetings')
  @Permissions('academics:read')
  async getDepartmentMeetings() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await this.prisma.meetingMinutes.findMany({
        where: { tenant_id: tenantId }
      });
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Post('marks/enter')
  @Permissions('academics:write')
  async enterMarks(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const { academicTermId, assessmentId, classSectionId, examSeriesId, score, studentId, subjectId, remarks } = body;
    try {
      const record = await this.prisma.examMarks.create({
        data: {
          academic_term_id: academicTermId || body.academic_term_id,
          assessment_id: assessmentId || body.assessment_id,
          class_section_id: classSectionId || body.class_section_id,
          exam_series_id: examSeriesId || body.exam_series_id,
          score: score,
          student_id: studentId || body.student_id,
          subject_id: subjectId || body.subject_id,
          tenant_id: tenantId,
          remarks: remarks || '',
          entered_by_user_id: '00000000-0000-0000-0000-000000000000',
          updated_by_user_id: '00000000-0000-0000-0000-000000000000',
        }
      });
      return { success: true, record };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }
}

