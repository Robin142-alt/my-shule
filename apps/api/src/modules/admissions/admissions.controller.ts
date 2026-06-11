
import { Inject } from '@nestjs/common';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTemplateDto } from './dto/create-template.dto';

import { DatabaseService } from '../../database/database.service';
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
} from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { StreamingUploadInterceptor } from '../../common/uploads/streaming-upload.interceptor';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  ReportExportQueueService,
  type QueueReportExportRequest,
} from '../../common/reports/report-export-queue';
import { CreateApplicationDto, UpdateApplicationDto } from './dto/create-application.dto';
import { ListAdmissionsQueryDto } from './dto/list-admissions-query.dto';
import {
  AdvanceAcademicLifecycleDto,
  CreateAllocationDto,
  CreateTransferRecordDto,
  RegisterApplicationDto,
  UpdateDocumentVerificationDto,
  UploadApplicationDocumentDto,
} from './dto/register-application.dto';
import { AdmissionsService } from './admissions.service';
import type { UploadedBinaryFile } from './storage/local-document-storage.service';

@Controller('admissions')
@RequiresModule('admissions')
export class AdmissionsController {

  @Inject(DatabaseService)
  private readonly db!: DatabaseService;

  @Inject(RequestContextService)
  private readonly requestContext!: RequestContextService;

  @Inject(SchoolOperationalEventsService)
  private readonly events!: SchoolOperationalEventsService;

  constructor(
    private readonly admissionsService: AdmissionsService,
    private readonly reportExportQueueService: ReportExportQueueService,
  ) {}

  @Get('summary')
  @Permissions('admissions:read')
  getSummary() {
    return this.admissionsService.getSummary();
  }

  @Get('applications')
  @Permissions('admissions:read')
  listApplications(@Query() query: ListAdmissionsQueryDto) {
    return this.admissionsService.listApplications(query);
  }

  @Post('applications')
  @Permissions('admissions:write')
  createApplication(@Body() dto: CreateApplicationDto) {
    return this.admissionsService.createApplication(dto);
  }

  @Patch('applications/:applicationId')
  @Permissions('admissions:write')
  updateApplication(
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.admissionsService.updateApplication(applicationId, dto);
  }

  @Post('applications/:applicationId/documents')
  @Permissions('documents:write')
  @UseInterceptors(StreamingUploadInterceptor('file'))
  uploadApplicationDocument(
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Body() dto: UploadApplicationDocumentDto,
    @UploadedFile() file: UploadedBinaryFile,
  ) {
    return this.admissionsService.storeApplicationDocument(applicationId, dto, file);
  }

  @Post('applications/:applicationId/register')
  @Permissions('admissions:write', 'students:write')
  registerApplication(
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Body() dto: RegisterApplicationDto,
  ) {
    return this.admissionsService.registerApprovedApplication(applicationId, dto);
  }

  @Get('students')
  @Permissions('admissions:read')
  listStudents(@Query() query: ListAdmissionsQueryDto) {
    return this.admissionsService.listStudents(query);
  }

  @Get('students/:studentId/profile')
  @Permissions('admissions:read')
  getStudentProfile(@Param('studentId', new ParseUUIDPipe()) studentId: string) {
    return this.admissionsService.getStudentProfile(studentId);
  }

  @Post('students/:studentId/academic-lifecycle')
  @Permissions('admissions:write', 'students:write')
  advanceStudentAcademicLifecycle(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: AdvanceAcademicLifecycleDto,
  ) {
    return this.admissionsService.advanceStudentAcademicLifecycle(studentId, dto);
  }

  @Get('parents')
  @Permissions('admissions:read')
  listParents(@Query() query: ListAdmissionsQueryDto) {
    return this.admissionsService.listParents(query);
  }

  @Get('documents')
  @Permissions('documents:read')
  listDocuments(@Query() query: ListAdmissionsQueryDto) {
    return this.admissionsService.listDocuments(query);
  }

  @Patch('documents/:documentId')
  @Permissions('documents:write')
  updateDocumentVerificationStatus(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() dto: UpdateDocumentVerificationDto,
  ) {
    return this.admissionsService.updateDocumentVerificationStatus(documentId, dto);
  }

  @Get('allocations')
  @Permissions('admissions:read')
  listAllocations(@Query() query: ListAdmissionsQueryDto) {
    return this.admissionsService.listAllocations(query);
  }

  @Post('allocations/:studentId')
  @Permissions('admissions:write')
  assignAllocation(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: CreateAllocationDto,
  ) {
    return this.admissionsService.assignAllocation(studentId, dto);
  }

  @Get('transfers')
  @Permissions('transfers:read')
  listTransfers(@Query() query: ListAdmissionsQueryDto) {
    return this.admissionsService.listTransfers(query);
  }

  @Post('transfers')
  @Permissions('transfers:write')
  createTransfer(@Body() dto: CreateTransferRecordDto) {
    return this.admissionsService.createTransfer(dto);
  }

  @Post('reports/:reportId/export-jobs')
  @Permissions('admissions:read')
  queueReportExport(
    @Param('reportId') reportId: string,
    @Body() body: QueueReportExportRequest = {},
  ) {
    return this.reportExportQueueService.enqueueCurrentRequestReportExport({
      module: 'admissions',
      report_id: reportId,
      format: body.format ?? 'csv',
      filters: body.filters,
      estimated_rows: body.estimated_rows,
    });
  }

  @Get('reports/:reportId/export')
  @Permissions('admissions:read')
  exportReport(@Param('reportId') reportId: string) {
    return this.admissionsService.exportReportCsv(reportId);
  }

  @Get('reports')
  @Permissions('admissions:read')
  getReports() {
    return this.admissionsService.getReports();
  }

  @Post('apply')
  @Permissions('admissions:write')
  async applyPhase5(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const result = await this.db.query(
      `INSERT INTO admissions_applications (tenant_id, school_id, reference_number, applicant_first_name, applicant_last_name, status) 
       VALUES ($1, $1, $2, $3, $4, $5) RETURNING *`,
      [store.tenant_id, store.tenant_id, Date.now().toString(), body.first_name || 'FN', body.last_name || 'LN', 'draft']
    );
    await this.events.recordSchoolOperation({
      schoolId: store.tenant_id,
      event: { 
        id: result.rows[0].id,
        type: 'admissions.application.submitted', 
        module: 'admissions', 
        title: 'New Admission Application', 
        body: 'A new admission application was submitted', 
        actorRole: store.role || 'system',
        createdAt: new Date().toISOString()
      }
    });
    return result.rows[0];
  }


  @Post('enquiries')
  @Permissions('admissions:write')
  async createEnquiry(@Body() dto: CreateEnquiryDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createEnquiry(store.tenant_id as string, dto, store.user_id as string);
  }

  @Post('interviews')
  @Permissions('admissions:write')
  async createInterview(@Body() dto: CreateInterviewDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createInterview(store.tenant_id as string, dto);
  }

  @Post('offers')
  @Permissions('admissions:write')
  async createOffer(@Body() dto: CreateOfferDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createOffer(store.tenant_id as string, dto);
  }

  @Post('appointments')
  @Permissions('admissions:write')
  async createAppointment(@Body() dto: CreateAppointmentDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createAppointment(store.tenant_id as string, dto);
  }

  @Post('tasks')
  @Permissions('admissions:write')
  async createTask(@Body() dto: CreateTaskDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createTask(store.tenant_id as string, dto);
  }

  @Post('templates')
  @Permissions('admissions:write')
  async createTemplate(@Body() dto: CreateTemplateDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createTemplate(store.tenant_id as string, dto, store.user_id as string);
  }

}
