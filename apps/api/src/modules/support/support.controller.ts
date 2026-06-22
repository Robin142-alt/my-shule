import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';

import { Public } from '../../auth/decorators/public.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { StreamingUploadInterceptor } from '../../common/uploads/streaming-upload.interceptor';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { DisciplineService } from '../discipline/discipline.service';
import { CounsellingService } from '../discipline/counselling.service';
import {
  AssignTicketDto,
  CreateInternalNoteDto,
  CreateSupportMessageDto,
  CreateSupportTicketDto,
  KnowledgeBaseQueryDto,
  ListSupportTicketsQueryDto,
  MergeTicketsDto,
  UpdateTicketStatusDto,
  UploadTicketAttachmentDto,
} from './dto/support.dto';
import { SupportService } from './support.service';
import { SupportStatusSubscriptionService } from './support-status-subscription.service';
import type { UploadedSupportFile } from './storage/support-attachment-storage.service';

@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly supportStatusSubscriptions: SupportStatusSubscriptionService,
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly disciplineService: DisciplineService,
    private readonly counsellingService: CounsellingService,
  ) {}

  @Get('categories')
  @Permissions('support:view')
  getCategories() {
    return this.supportService.getCategories();
  }

  @Get('tickets')
  @Permissions('support:view')
  listTickets(@Query() query: ListSupportTicketsQueryDto) {
    return this.supportService.listTickets(query);
  }

  @Post('tickets')
  @Permissions('support:create')
  createTicket(@Body() dto: CreateSupportTicketDto) {
    return this.supportService.createTicket(dto);
  }

  @Get('tickets/:ticketId')
  @Permissions('support:view')
  getTicket(@Param('ticketId', new ParseUUIDPipe()) ticketId: string) {
    return this.supportService.getTicket(ticketId);
  }

  @Post('tickets/:ticketId/messages')
  @Permissions('support:reply')
  replyToTicket(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportService.replyToTicket(ticketId, dto);
  }

  @Post('tickets/:ticketId/attachments')
  @Permissions('support:reply')
  @UseInterceptors(StreamingUploadInterceptor('file'))
  uploadAttachment(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: UploadTicketAttachmentDto,
    @UploadedFile() file: UploadedSupportFile,
  ) {
    return this.supportService.uploadAttachment(ticketId, dto, file);
  }

  @Post('tickets/:ticketId/internal-notes')
  @Permissions('support:manage')
  addInternalNote(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: CreateInternalNoteDto,
  ) {
    return this.supportService.addInternalNote(ticketId, dto);
  }

  @Patch('tickets/:ticketId/status')
  @Permissions('support:manage')
  updateTicketStatus(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.supportService.updateTicketStatus(ticketId, dto);
  }

  @Patch('tickets/:ticketId/assign')
  @Permissions('support:manage')
  assignTicket(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.supportService.assignTicket(ticketId, dto);
  }

  @Patch('tickets/:ticketId/escalate')
  @Permissions('support:manage')
  escalateTicket(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.supportService.escalateTicket(ticketId, dto.reason);
  }

  @Patch('tickets/:ticketId/merge')
  @Permissions('support:manage')
  mergeTicket(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: MergeTicketsDto,
  ) {
    return this.supportService.mergeTickets(ticketId, dto);
  }

  @Get('knowledge-base')
  @Permissions('support:view')
  listKnowledgeBase(@Query() query: KnowledgeBaseQueryDto) {
    return this.supportService.listKnowledgeBase(query);
  }

  @Get('system-status')
  @Permissions('support:view')
  getSystemStatus() {
    return this.supportService.getSystemStatus();
  }

  @Get('public/system-status')
  @Public()
  async getPublicSystemStatus() {
    const status = await this.supportService.getSystemStatus();

    return this.supportStatusSubscriptions.toPublicStatus(status);
  }

  @Post('public/status-subscriptions')
  @Public()
  subscribeToStatus(
    @Body() dto: { email?: string; locale?: string },
    @Req() request: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.supportStatusSubscriptions.subscribe({
      email: dto.email ?? '',
      locale: dto.locale,
      consentSource: 'public_status_page',
      clientIp: resolveClientIp(request),
    });
  }

  @Post('public/status-subscriptions/unsubscribe')
  @Public()
  unsubscribeFromStatus(@Body() dto: { token?: string }) {
    return this.supportStatusSubscriptions.unsubscribe({ token: dto.token ?? '' });
  }

  @Get('notifications')
  @Permissions('support:view')
  listNotifications() {
    return this.supportService.listNotifications();
  }

  @Get('admin/notifications/dead-letter')
  @Permissions('support:manage')
  listNotificationDeadLetters() {
    return this.supportService.listNotificationDeadLetters();
  }

  @Get('admin/analytics')
  @Permissions('support:manage')
  getAnalytics() {
    return this.supportService.getAnalytics();
  }

  @Get('discipline')
  @Permissions('support:view')
  async getDiscipline() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) return [];

    try {
      const incidents = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, student_id, class_id, severity, status, title, description, parent_notification_status, metadata, occurred_at, reporting_staff_id
         FROM discipline_incidents
         WHERE school_id = $1::uuid`,
        tenantId
      );

      const studentIds = [...new Set(incidents.map(i => i.student_id).filter(Boolean))];
      const classIds = [...new Set(incidents.map(i => i.class_id).filter(Boolean))];
      const staffIds = [...new Set(incidents.map(i => i.reporting_staff_id).filter(Boolean))];

      let studentsMap: Record<string, { name: string; guardianPhone: string }> = {};
      let classesMap: Record<string, string> = {};
      let staffMap: Record<string, string> = {};

      if (studentIds.length > 0) {
        const students = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT id, "firstName", "lastName", "guardianPhone" FROM students WHERE id = ANY($1::uuid[])`,
          [studentIds]
        );
        for (const s of students) {
          studentsMap[s.id] = {
            name: `${s.firstName} ${s.lastName}`,
            guardianPhone: s.guardianPhone || ''
          };
        }
      }

      if (classIds.length > 0) {
        const classes = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT id, name FROM classes WHERE id = ANY($1::uuid[])`,
          [classIds]
        );
        for (const c of classes) {
          classesMap[c.id] = c.name;
        }
      }

      if (staffIds.length > 0) {
        const staff = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[])`,
          [staffIds]
        );
        for (const s of staff) {
          staffMap[s.id] = `${s.firstName} ${s.lastName}`;
        }
      }

      return incidents.map(i => {
        const studentInfo = studentsMap[i.student_id] || { name: 'Unknown Student', guardianPhone: '' };
        let parentSmsSent = false;
        if (i.parent_notification_status === 'SENT' || i.parent_notification_status === 'DELIVERED') {
          parentSmsSent = true;
        }
        let metaObj: any = {};
        try {
          metaObj = typeof i.metadata === 'string' ? JSON.parse(i.metadata) : (i.metadata || {});
        } catch {}
        if (metaObj.parentSmsSent !== undefined) parentSmsSent = metaObj.parentSmsSent;
        const counsellorReferred = metaObj.counsellorReferred || false;

        let mappedStatus = i.status;
        if (mappedStatus === 'new' || mappedStatus === 'NEW') mappedStatus = 'New';
        else if (mappedStatus === 'under_review' || mappedStatus === 'UNDER_REVIEW') mappedStatus = 'Under Review';
        else if (mappedStatus === 'escalated' || mappedStatus === 'ESCALATED') mappedStatus = 'Escalated';
        else if (mappedStatus === 'counsellor_referral' || mappedStatus === 'COUNSELLOR_REFERRAL') mappedStatus = 'Counsellor Referral';
        else if (mappedStatus === 'resolved' || mappedStatus === 'RESOLVED') mappedStatus = 'Resolved';

        let mappedSeverity = i.severity;
        if (mappedSeverity === 'minor' || mappedSeverity === 'MINOR') mappedSeverity = 'Minor';
        else if (mappedSeverity === 'moderate' || mappedSeverity === 'MODERATE') mappedSeverity = 'Moderate';
        else if (mappedSeverity === 'serious' || mappedSeverity === 'SERIOUS') mappedSeverity = 'Serious';
        else if (mappedSeverity === 'critical' || mappedSeverity === 'CRITICAL') mappedSeverity = 'Critical';

        return {
          id: i.id,
          student: studentInfo.name,
          className: classesMap[i.class_id] || 'Unknown Class',
          caseType: i.title || 'Other',
          severity: mappedSeverity || 'Minor',
          reportedBy: staffMap[i.reporting_staff_id] || 'Staff Member',
          guardianPhone: studentInfo.guardianPhone,
          notes: i.description || '',
          status: mappedStatus || 'New',
          parentSmsSent,
          counsellorReferred,
          time: i.occurred_at ? i.occurred_at.toISOString() : new Date().toISOString()
        };
      });
    } catch (e) {
      console.error('get support discipline error:', e);
      return [];
    }
  }

  @Post('discipline')
  @Permissions('support:manage')
  async postDiscipline(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) return { success: false };

    const { action } = body;
    if (action !== 'add_case' && action !== 'update_case') {
      return { success: false, error: 'Unknown action' };
    }

    try {
      return await this.prisma.withRequestTransaction(async (tx) => {
        if (action === 'add_case') {
          const { record } = body;
          let studentId: string | null = null;
          if (record.student) {
            const parts = record.student.trim().split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts[parts.length - 1] || '';
            const student = await tx.student.findFirst({
              where: {
                schoolId: tenantId,
                OR: [
                  { firstName: { contains: firstName, mode: 'insensitive' } },
                  { lastName: { contains: lastName, mode: 'insensitive' } }
                ]
              }
            });
            if (student) studentId = student.id;
          }
          if (!studentId) {
            const student = await tx.student.findFirst({ where: { schoolId: tenantId } });
            if (student) studentId = student.id;
          }

          let classId: string | null = null;
          if (record.className) {
            const classObj = await tx.class.findFirst({
              where: {
                schoolId: tenantId,
                name: { contains: record.className.trim(), mode: 'insensitive' }
              }
            });
            if (classObj) classId = classObj.id;
          }
          if (!classId) {
            const classObj = await tx.class.findFirst({ where: { schoolId: tenantId } });
            if (classObj) classId = classObj.id;
          }

          let termId = '00000000-0000-0000-0000-000000000000';
          const term = await tx.term.findFirst({ where: { schoolId: tenantId } });
          if (term) termId = term.id;

          let academicYearId = '00000000-0000-0000-0000-000000000000';
          const academicYear = await tx.academicYear.findFirst({ where: { schoolId: tenantId } });
          if (academicYear) academicYearId = academicYear.id;

          let staffId = '00000000-0000-0000-0000-000000000000';
          const staff = await tx.schoolMembership.findFirst({ where: { schoolId: tenantId } });
          if (staff) staffId = staff.userId;

          const categoryId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

          await tx.disciplineIncident.create({
            data: {
              id: record.id || undefined,
              tenant_id: tenantId,
              school_id: tenantId,
              student_id: studentId || '00000000-0000-0000-0000-000000000000',
              class_id: classId || '00000000-0000-0000-0000-000000000000',
              academic_term_id: termId,
              academic_year_id: academicYearId,
              offense_category_id: categoryId,
              reporting_staff_id: staffId,
              incident_number: `INC-${Date.now()}`,
              title: record.caseType || 'Other offense',
              severity: (record.severity || 'Minor').toLowerCase(),
              status: (record.status || 'New').toLowerCase().replace(' ', '_'),
              occurred_at: new Date(),
              description: record.notes || '',
              parent_notification_status: record.parentSmsSent ? 'SENT' : 'NOT_SENT',
              metadata: {
                parentSmsSent: record.parentSmsSent || false,
                counsellorReferred: record.counsellorReferred || false
              }
            }
          });
        } else if (action === 'update_case') {
          const { id, updates } = body;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!id || !uuidRegex.test(id)) {
            throw new BadRequestException('Invalid ID format');
          }
          const existing = await tx.disciplineIncident.findFirst({
            where: {
              id,
              OR: [
                { school_id: tenantId },
                { tenant_id: tenantId }
              ]
            }
          });
          if (!existing) {
            throw new BadRequestException('Discipline incident not found or access denied');
          }
          let metaObj = typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : (existing.metadata || {});
          if (updates.parentSmsSent !== undefined) {
            metaObj.parentSmsSent = updates.parentSmsSent;
          }
          if (updates.counsellorReferred !== undefined) {
            metaObj.counsellorReferred = updates.counsellorReferred;
          }

          let dbStatus = existing.status;
          if (updates.status) {
            dbStatus = updates.status.toLowerCase().replace(' ', '_');
          }

          await tx.disciplineIncident.update({
            where: { id },
            data: {
              status: dbStatus,
              parent_notification_status: updates.parentSmsSent ? 'SENT' : existing.parent_notification_status,
              metadata: metaObj
            }
          });
        }
        return { success: true };
      });
    } catch (err) {
      console.error('postDiscipline error:', err);
      return { success: false, error: (err as any).message };
    }
  }

  @Get('counselling')
  @Permissions('support:view')
  async getCounselling() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) return [];

    try {
      const sessions = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, student_id, counsellor_user_id, scheduled_for, location, agenda, status
         FROM counselling_sessions
         WHERE school_id = $1::uuid`,
        tenantId
      );

      const studentIds = [...new Set(sessions.map(s => s.student_id).filter(Boolean))];
      let studentsMap: Record<string, { name: string; className: string; guardianPhone: string }> = {};

      if (studentIds.length > 0) {
        const students = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT s.id, s."firstName", s."lastName", s."guardianPhone", c.name as class_name
           FROM students s
           LEFT JOIN classes c ON s.class_id = c.id
           WHERE s.id = ANY($1::uuid[])`,
          [studentIds]
        );
        for (const s of students) {
          studentsMap[s.id] = {
            name: `${s.firstName} ${s.lastName}`,
            className: s.class_name || 'Unknown Class',
            guardianPhone: s.guardianPhone || ''
          };
        }
      }

      return sessions.map(s => {
        const studentInfo = studentsMap[s.student_id] || { name: 'Unknown Student', className: 'Unknown Class', guardianPhone: '' };
        return {
          id: s.id,
          student: studentInfo.name,
          className: studentInfo.className,
          referralSource: 'Teacher',
          riskLevel: 'Medium',
          sessionType: s.agenda || 'Welfare Check',
          guardianPhone: studentInfo.guardianPhone,
          notes: s.location || '',
          followUpDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
          status: s.status === 'scheduled' ? 'Open' : 'Closed',
          guardianSmsSent: false
        };
      });
    } catch (e) {
      console.error('get support counselling error:', e);
      return [];
    }
  }

  @Post('counselling')
  @Permissions('support:manage')
  async postCounselling(@Body() body: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) return { success: false };

    const { action } = body;
    try {
      return await this.prisma.withRequestTransaction(async (tx) => {
        if (action === 'add_session') {
          const { session } = body;
          let studentId: string | null = null;
          if (session.student) {
            const parts = session.student.trim().split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts[parts.length - 1] || '';
            const student = await tx.student.findFirst({
              where: {
                schoolId: tenantId,
                OR: [
                  { firstName: { contains: firstName, mode: 'insensitive' } },
                  { lastName: { contains: lastName, mode: 'insensitive' } }
                ]
              }
            });
            if (student) studentId = student.id;
          }
          if (!studentId) {
            const student = await tx.student.findFirst({ where: { schoolId: tenantId } });
            if (student) studentId = student.id;
          }

          let counsellorUserId: string | null = null;
          const staff = await tx.schoolMembership.findFirst({ where: { schoolId: tenantId } });
          if (staff) counsellorUserId = staff.userId;
          else {
            const user = await tx.user.findFirst();
            if (user) counsellorUserId = user.id;
          }

          if (studentId && counsellorUserId) {
            await tx.$executeRawUnsafe(
              `INSERT INTO counselling_sessions (id, tenant_id, school_id, student_id, counsellor_user_id, scheduled_for, location, agenda, status, created_at, updated_at)
               VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5::uuid, $6::timestamp, $7, $8, $9, NOW(), NOW())`,
              session.id || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
              tenantId,
              tenantId,
              studentId,
              counsellorUserId,
              new Date(),
              session.notes || 'Main Office',
              session.sessionType || 'Welfare Check',
              session.status === 'Open' ? 'scheduled' : 'completed'
            );
          }
        } else if (action === 'update_session') {
          const { id, updates } = body;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!id || !uuidRegex.test(id)) {
            throw new BadRequestException('Invalid ID format');
          }
          let dbStatus = 'scheduled';
          if (updates.status) {
            dbStatus = updates.status === 'Open' ? 'scheduled' : 'completed';
          }
          
          // Verify that the counselling session exists and belongs to the caller's school context
          const existing = await tx.legacyCounsellingSession.findFirst({
            where: {
              id,
              OR: [
                { school_id: tenantId },
                { tenant_id: tenantId }
              ]
            }
          });
          if (!existing) {
            throw new BadRequestException('Counselling session not found or access denied');
          }

          await tx.legacyCounsellingSession.update({
            where: { id },
            data: {
              status: dbStatus,
              updated_at: new Date()
            }
          });
        }
        return { success: true };
      });
    } catch (err) {
      console.error('postCounselling error:', err);
      return { success: false, error: (err as any).message };
    }
  }


}

function resolveClientIp(request: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string | null {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const clientIp = firstForwarded?.split(',')[0]?.trim() || request.ip?.trim();

  return clientIp || null;
}
