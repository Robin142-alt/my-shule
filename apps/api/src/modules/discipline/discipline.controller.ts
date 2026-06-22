
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  InternalServerErrorException,
  NotImplementedException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { StreamingUploadInterceptor } from '../../common/uploads/streaming-upload.interceptor';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  AcknowledgeDisciplineIncidentDto,
  AssignDisciplineIncidentDto,
  CompleteDisciplineActionDto,
  CreateCommendationDto,
  CreateDisciplineActionDto,
  CreateDisciplineCommentDto,
  CreateDisciplineIncidentDto,
  CreateOffenseCategoryDto,
  ExportDisciplineReportDto,
  GenerateDisciplineDocumentDto,
  ListDisciplineIncidentsQueryDto,
  UpdateDisciplineIncidentDto,
  UpdateDisciplineStatusDto,
  UploadDisciplineAttachmentDto,
} from './dto/discipline.dto';
import { DisciplineService } from './discipline.service';
import type { UploadedDisciplineFile } from './storage/discipline-attachment-storage.service';
import { ApprovalsService } from '../approvals/approvals.service';

@Controller('discipline')
@RequiresModule('discipline')
export class DisciplineController {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }


  @Inject(PrismaService)
  private readonly db!: PrismaService;

  @Inject(RequestContextService)
  private readonly requestContext!: RequestContextService;

  @Inject(SchoolOperationalEventsService)
  private readonly events!: SchoolOperationalEventsService;

  @Inject(ApprovalsService)
  private readonly approvals!: ApprovalsService;

  constructor(private readonly prisma: PrismaService, private readonly disciplineService: DisciplineService) {}

  @Get('dashboard')
  @Permissions('discipline:read')
  getDashboard() {
    return this.disciplineService.getDashboard();
  }

  @Get('offense-categories')
  @Permissions('discipline:read')
  listOffenseCategories() {
    return this.disciplineService.listOffenseCategories();
  }

  @Post('offense-categories')
  @Permissions('discipline:manage')
  upsertOffenseCategory(@Body() dto: CreateOffenseCategoryDto) {
    return this.disciplineService.upsertOffenseCategory(dto);
  }

  @Get('incidents')
  @Permissions('discipline:read')
  listIncidents(@Query() query: ListDisciplineIncidentsQueryDto) {
    return this.disciplineService.listIncidents(query);
  }

  @Get('parent/incidents')
  @Permissions('portal:read_own_children')
  listParentIncidents(@Query() query: { limit?: number; offset?: number }) {
    return this.disciplineService.listParentIncidents(query);
  }

  /* @Post('incidents')
  @Permissions('discipline:write')
  createIncident(@Body() dto: CreateDisciplineIncidentDto) {
    return this.disciplineService.createIncident(dto);
  } */

  @Get('incidents/:incidentId')
  @Permissions('discipline:read')
  getIncident(@Param('incidentId', new ParseUUIDPipe()) incidentId: string) {
    return this.disciplineService.getIncident(incidentId);
  }

  @Patch('incidents/:incidentId')
  @Permissions('discipline:write')
  updateIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: UpdateDisciplineIncidentDto,
  ) {
    return this.disciplineService.updateIncident(incidentId, dto);
  }

  @Post('incidents/:incidentId/status')
  @Permissions('discipline:manage')
  updateStatus(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: UpdateDisciplineStatusDto,
  ) {
    return this.disciplineService.updateStatus(incidentId, dto);
  }

  @Post('incidents/:incidentId/assign')
  @Permissions('discipline:manage')
  assignIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: AssignDisciplineIncidentDto,
  ) {
    return this.disciplineService.assignIncident(incidentId, dto);
  }

  @Post('incidents/:incidentId/escalate')
  @Permissions('discipline:manage')
  async escalateIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: { reason?: string },
  ) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant context is required');

    const approvalResult = await this.approvals.enforceApprovalRule({
      schoolId: tenantId,
      userId: store.user_id,
      userRole: store.role || 'staff',
      module: 'DISCIPLINE',
      action: 'ESCALATE_INCIDENT',
      targetEntityType: 'DISCIPLINE_INCIDENT',
      targetEntityId: incidentId,
      newValue: { reason: dto.reason },
      reason: dto.reason,
    });

    if (approvalResult.mode === 'CREATE_APPROVAL_REQUEST') {
      return {
        success: true,
        status: 'PENDING_APPROVAL',
        message: 'Escalation request submitted for approval.',
        request: approvalResult.request,
      };
    }

    const result = await this.disciplineService.executeEscalation(incidentId, tenantId, dto.reason || '', store.user_id);
    return { success: true, status: 'APPROVED', data: result };
  }

  @Post('incidents/:incidentId/resolve')
  @Permissions('discipline:manage')
  async resolveIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: { reason?: string },
  ) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant context is required');

    const approvalResult = await this.approvals.enforceApprovalRule({
      schoolId: tenantId,
      userId: store.user_id,
      userRole: store.role || 'staff',
      module: 'DISCIPLINE',
      action: 'RESOLVE_INCIDENT',
      targetEntityType: 'DISCIPLINE_INCIDENT',
      targetEntityId: incidentId,
      newValue: { reason: dto.reason },
      reason: dto.reason,
    });

    if (approvalResult.mode === 'CREATE_APPROVAL_REQUEST') {
      return {
        success: true,
        status: 'PENDING_APPROVAL',
        message: 'Resolution request submitted for approval.',
        request: approvalResult.request,
      };
    }

    const result = await this.disciplineService.executeResolution(incidentId, tenantId, dto.reason || '', store.user_id);
    return { success: true, status: 'APPROVED', data: result };
  }

  @Post('incidents/:incidentId/close')
  @Permissions('discipline:manage')
  async closeIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: { reason?: string },
  ) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant context is required');

    const approvalResult = await this.approvals.enforceApprovalRule({
      schoolId: tenantId,
      userId: store.user_id,
      userRole: store.role || 'staff',
      module: 'DISCIPLINE',
      action: 'CLOSE_INCIDENT',
      targetEntityType: 'DISCIPLINE_INCIDENT',
      targetEntityId: incidentId,
      newValue: { reason: dto.reason },
      reason: dto.reason,
    });

    if (approvalResult.mode === 'CREATE_APPROVAL_REQUEST') {
      return {
        success: true,
        status: 'PENDING_APPROVAL',
        message: 'Closure request submitted for approval.',
        request: approvalResult.request,
      };
    }

    const result = await this.disciplineService.executeClosure(incidentId, tenantId, dto.reason || '', store.user_id);
    return { success: true, status: 'APPROVED', data: result };
  }

  @Post('incidents/:incidentId/actions')
  @Permissions('discipline:manage')
  createAction(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: CreateDisciplineActionDto,
  ) {
    return this.disciplineService.createAction(incidentId, dto);
  }

  @Post('actions/:actionId/complete')
  @Permissions('discipline:manage')
  completeAction(
    @Param('actionId', new ParseUUIDPipe()) actionId: string,
    @Body() dto: CompleteDisciplineActionDto,
  ) {
    return this.disciplineService.completeAction(actionId, dto);
  }

  @Post('actions/:actionId/approve')
  @Permissions('discipline:approve')
  async approveAction(@Param('actionId', new ParseUUIDPipe()) actionId: string, @Res({ passthrough: true }) res: any) {
    res.setHeader('Warning', '299 - "This endpoint is deprecated. Use processApprovalAction via /api/approvals/:id/action instead."');
    return this.disciplineService.approveAction(actionId);
  }

  @Post('incidents/:incidentId/comments')
  @Permissions('discipline:write')
  createComment(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: CreateDisciplineCommentDto,
  ) {
    return this.disciplineService.createComment(incidentId, dto);
  }

  @Post('incidents/:incidentId/attachments')
  @Permissions('discipline:write')
  @UseInterceptors(StreamingUploadInterceptor('file'))
  uploadAttachment(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: UploadDisciplineAttachmentDto,
    @UploadedFile() file: UploadedDisciplineFile,
  ) {
    return this.disciplineService.uploadAttachment(incidentId, dto, file);
  }

  @Post('commendations')
  @Permissions('discipline:write')
  createCommendation(@Body() dto: CreateCommendationDto) {
    return this.disciplineService.createCommendation(dto);
  }

  @Get('students/:studentId/behavior-score')
  @Permissions('discipline:read')
  getStudentBehaviorScore(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Query() query: { academic_term_id?: string; academic_year_id?: string },
  ) {
    return this.disciplineService.getStudentBehaviorScore(studentId, query);
  }

  @Post('parent/incidents/:incidentId/acknowledge')
  @Permissions('portal:read_own_children')
  acknowledgeIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: AcknowledgeDisciplineIncidentDto,
  ) {
    return this.disciplineService.acknowledgeIncident(incidentId, dto);
  }

  @Get('analytics/overview')
  @Permissions('discipline:reports')
  getAnalytics() {
    return this.disciplineService.getAnalytics();
  }

  @Post('reports/export')
  @Permissions('discipline:reports')
  exportReport(@Body() dto: ExportDisciplineReportDto) {
    return this.disciplineService.exportReport(dto);
  }

  @Post('incidents/:incidentId/documents')
  @Permissions('discipline:manage')
  generateDocument(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: GenerateDisciplineDocumentDto,
  ) {
    return this.disciplineService.generateDocument(incidentId, dto);
  }

  @Post('incidents')
  @Permissions('discipline:write')
  async createIncidentPhase5(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const result = await this.db.query(
      `INSERT INTO discipline_incidents (tenant_id, school_id, incident_number, title, description, severity, status) 
       VALUES ($1, $1, $2, $3, $4, $5, $6) RETURNING *`,
      [store.tenant_id, store.tenant_id, Date.now().toString(), body.title || 'Incident', body.description || 'Desc', 'moderate', 'reported']
    );
    await this.events.recordSchoolOperation({
      schoolId: store.tenant_id,
      event: { 
        id: result.rows[0].id,
        type: 'discipline.incident.reported', 
        module: 'discipline', 
        title: 'New Incident', 
        body: 'A discipline incident was reported', 
        actorRole: store.role || 'system',
        createdAt: new Date().toISOString()
      }
    });
    return result.rows[0];
  }


  @Get('cases')
  @Permissions('discipline:read')
  async getCases() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) return [];

    try {
      const result = await this.executeSql(
        `SELECT * FROM discipline_incidents WHERE school_id = $1::uuid`,
        [tenantId]
      );
      return result.rows;
    } catch (e: any) {
      console.error('getCases error:', e);
      throw new InternalServerErrorException(e.message || 'Database error occurred');
    }
  }
}
