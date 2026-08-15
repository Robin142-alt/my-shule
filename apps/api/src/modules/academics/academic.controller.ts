import { BadRequestException, Body, Controller, Get, Post, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
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

  private normalizeMark(input: any) {
    const mark = {
      academicTermId: String(input?.academicTermId ?? input?.academic_term_id ?? '').trim(),
      assessmentId: String(input?.assessmentId ?? input?.assessment_id ?? '').trim(),
      classSectionId: String(input?.classSectionId ?? input?.class_section_id ?? '').trim(),
      examSeriesId: String(input?.examSeriesId ?? input?.exam_series_id ?? '').trim(),
      studentId: String(input?.studentId ?? input?.student_id ?? '').trim(),
      subjectId: String(input?.subjectId ?? input?.subject_id ?? '').trim(),
      score: Number(input?.score),
      remarks: String(input?.remarks ?? '').trim(),
    };
    const ids = [
      mark.academicTermId,
      mark.assessmentId,
      mark.classSectionId,
      mark.examSeriesId,
      mark.studentId,
      mark.subjectId,
    ];
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (ids.some((id) => !uuidPattern.test(id))) {
      throw new BadRequestException('Every mark must reference valid academic records');
    }
    if (!Number.isFinite(mark.score) || mark.score < 0) {
      throw new BadRequestException('Mark score must be a non-negative number');
    }

    return mark;
  }

  private async validateMarkReferences(tx: any, tenantId: string, mark: ReturnType<AcademicController['normalizeMark']>) {
    const rows = await tx.$queryRawUnsafe(
      `
        SELECT
          EXISTS (
            SELECT 1
            FROM students student
            WHERE student.tenant_id = $1
              AND student.id::text = $2
              AND lower(COALESCE(student.status, 'active')) IN ('accepted', 'enrolled', 'active')
              AND student.deleted_at IS NULL
          ) AS student_exists,
          EXISTS (
            SELECT 1
            FROM class_sections section
            WHERE section.tenant_id = $1
              AND section.id::text = $3
              AND section.is_active = TRUE
              AND lower(COALESCE(section.status, 'active')) = 'active'
              AND section.archived_at IS NULL
          ) AS class_exists,
          EXISTS (
            SELECT 1
            FROM academic_terms term
            WHERE term.tenant_id = $1
              AND term.id::text = $4
              AND lower(COALESCE(term.status, 'active')) = 'active'
              AND term.archived_at IS NULL
          ) AS term_exists,
          EXISTS (
            SELECT 1
            FROM exam_series series
            WHERE series.tenant_id = $1
              AND series.id::text = $5
              AND series.academic_term_id::text = $4
              AND lower(COALESCE(series.status, 'draft')) <> 'archived'
          ) AS series_exists,
          EXISTS (
            SELECT 1
            FROM subjects subject
            WHERE subject.tenant_id = $1
              AND subject.id::text = $6
              AND lower(COALESCE(subject.status, 'active')) = 'active'
              AND subject.deleted_at IS NULL
              AND subject.archived_at IS NULL
          ) AS subject_exists,
          EXISTS (
            SELECT 1
            FROM student_class_assignments assignment
            WHERE assignment.tenant_id = $1
              AND assignment.student_id::text = $2
              AND assignment.class_section_id::text = $3
              AND assignment.status = 'active'
          ) AS class_assignment_exists,
          assessment.max_score::text AS max_score
        FROM exam_assessments assessment
        WHERE assessment.tenant_id = $1
          AND assessment.id::text = $7
          AND assessment.exam_series_id::text = $5
          AND assessment.subject_id::text = $6
        LIMIT 1
      `,
      tenantId,
      mark.studentId,
      mark.classSectionId,
      mark.academicTermId,
      mark.examSeriesId,
      mark.subjectId,
      mark.assessmentId,
    );
    const validation = Array.isArray(rows) ? rows[0] : rows;
    const referencesAreValid = validation
      && validation.student_exists === true
      && validation.class_exists === true
      && validation.term_exists === true
      && validation.series_exists === true
      && validation.subject_exists === true
      && validation.class_assignment_exists === true;

    if (!referencesAreValid) {
      throw new BadRequestException('Mark references are not active records in this school');
    }

    const maxScore = Number(validation.max_score);
    if (!Number.isFinite(maxScore) || mark.score > maxScore) {
      throw new BadRequestException(`Mark score cannot exceed ${validation.max_score}`);
    }
  }

  @Get('communications')
  @Permissions('academics:read')
  async getCommunications() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
        tx.communicationBroadcast.findMany({
          where: { schoolId: tenantId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Post('dean/lock-batch')
  @Permissions('academics:write')
  async lockBatch(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const batchId = String(body?.batchId ?? body?.id ?? '').trim();
    if (!batchId) throw new BadRequestException('Report-card batch ID is required');
    try {
      const result = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
        tx.reportCardGenerationBatches.updateMany({
          where: { id: batchId, tenant_id: tenantId },
          data: { status: 'LOCKED' }
        }),
      );
      if (result.count !== 1) throw new BadRequestException('Report-card batch was not found in this school');
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
    return { success: true };
  }

  @Post('dean/action')
  @Permissions('academics:write')
  async deanAction(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const taskId = String(body?.taskId ?? '').trim();
    const action = String(body?.action ?? '').trim().toLowerCase();
    if (!taskId) throw new BadRequestException('Academic task ID is required');
    if (!['approve', 'reject'].includes(action)) throw new BadRequestException('Action must be approve or reject');
    try {
      const result = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
        tx.workflowTask.updateMany({
          where: { id: taskId, schoolId: tenantId },
          data: { status: action === 'approve' ? 'DONE' : 'CANCELLED' }
        }),
      );
      if (result.count !== 1) throw new BadRequestException('Academic task was not found in this school');
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
    return { success: true };
  }

  @Post('exams-manager/import-marks')
  @Permissions('academics:write')
  async importMarks(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    if (!store.user_id) throw new UnauthorizedException('User ID required');
    if (!Array.isArray(body?.marks) || body.marks.length === 0) {
      throw new BadRequestException('At least one mark is required');
    }
    const marks = body.marks.map((mark: any) => this.normalizeMark(mark));

    return this.prisma.executeWithTenant(tenantId, store.user_id, async (tx) => {
      // Validate the complete import first so a foreign record never causes a
      // partial batch write, even before transaction rollback is considered.
      for (const mark of marks) {
        await this.validateMarkReferences(tx, tenantId, mark);
      }

      const records = [];
      for (const mark of marks) {
        records.push(await tx.examMarks.create({
          data: {
            academic_term_id: mark.academicTermId,
            assessment_id: mark.assessmentId,
            class_section_id: mark.classSectionId,
            entered_by_user_id: store.user_id,
            exam_series_id: mark.examSeriesId,
            score: mark.score,
            student_id: mark.studentId,
            subject_id: mark.subjectId,
            tenant_id: tenantId,
            remarks: mark.remarks,
            updated_by_user_id: store.user_id,
            status: 'draft',
          },
        }));
      }

      return { success: true, imported: records.length };
    });
  }

  @Get('exams-manager/export-marks')
  @Permissions('academics:read')
  async exportMarks() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const items = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
      tx.examMarks.findMany({
        where: { tenant_id: tenantId }
      }),
    );
    return { items };
  }

  @Post('exams-manager/zeraki-sync')
  @Permissions('academics:write')
  async syncZeraki(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const count = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
      tx.examMarks.count({
        where: { tenant_id: tenantId }
      }),
    );
    return { success: true, count };
  }

  @Post('grade-master/compile')
  @Permissions('academics:write')
  async compileGrades(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const studentId = String(body?.studentId ?? '').trim();
    const examSeriesId = String(body?.examSeriesId ?? '').trim();
    if (!studentId || !examSeriesId) throw new BadRequestException('Student and exam series are required');
    try {
      const result = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
        tx.studentReportCards.updateMany({
          where: { student_id: studentId, exam_series_id: examSeriesId, tenant_id: tenantId },
          data: { status: 'compiled' }
        }),
      );
      if (result.count === 0) throw new BadRequestException('No report cards matched this student and exam series in this school');
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
    return { success: true };
  }

  @Post('grade-master/comment')
  @Permissions('academics:write')
  async addComment(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    const reportCardId = String(body?.reportCardId ?? '').trim();
    const comment = String(body?.comment ?? '').trim();
    if (!reportCardId) throw new BadRequestException('Report-card ID is required');
    if (!comment) throw new BadRequestException('Comment is required');
    try {
      const updated = await this.prisma.executeWithTenant(tenantId, store.user_id, async (tx) => {
        const rc = await tx.studentReportCards.findFirst({
          where: { id: reportCardId, tenant_id: tenantId }
        });
        if (!rc) return false;
        let metadataObj = typeof rc.metadata === 'string' ? JSON.parse(rc.metadata) : rc.metadata;
        if (!metadataObj || typeof metadataObj !== 'object' || Array.isArray(metadataObj)) {
          metadataObj = {};
        }
        const result = await tx.studentReportCards.updateMany({
          where: { id: reportCardId, tenant_id: tenantId },
          data: { metadata: { ...(metadataObj as Record<string, unknown>), comment } }
        });
        return result.count === 1;
      });
      if (!updated) throw new BadRequestException('Report card was not found in this school');
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
    return { success: true };
  }

  @Get('hod/requests')
  @Permissions('academics:read')
  async getHodRequests() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
        tx.approvalRequest.findMany({ where: { schoolId: tenantId } }),
      );
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Get('hod/subject-allocation')
  @Permissions('academics:read')
  async getSubjectAllocation() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
        tx.subject.findMany({ where: { schoolId: tenantId } }),
      );
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Get('hod/department-meetings')
  @Permissions('academics:read')
  async getDepartmentMeetings() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await this.prisma.executeWithTenant(tenantId, store.user_id, (tx) =>
        tx.meetingMinutes.findMany({ where: { tenant_id: tenantId } }),
      );
      return { items };
    } catch (e: any) {
      console.error('academic.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }

  @Post('marks/enter')
  @Permissions('academics:write')
  async enterMarks(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    if (!store.user_id) throw new UnauthorizedException('User ID required');
    const mark = this.normalizeMark(body);
    const record = await this.prisma.executeWithTenant(tenantId, store.user_id, async (tx) => {
      await this.validateMarkReferences(tx, tenantId, mark);
      return tx.examMarks.create({
        data: {
          academic_term_id: mark.academicTermId,
          assessment_id: mark.assessmentId,
          class_section_id: mark.classSectionId,
          exam_series_id: mark.examSeriesId,
          score: mark.score,
          student_id: mark.studentId,
          subject_id: mark.subjectId,
          tenant_id: tenantId,
          remarks: mark.remarks,
          entered_by_user_id: store.user_id,
          updated_by_user_id: store.user_id,
        }
      });
    });
    return { success: true, record };
  }
}
