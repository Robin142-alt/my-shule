import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SecretaryCommandService } from './secretary-command.service';

@Controller('admin-command/secretary')
@RequiresModule('visitor_management')
@Permissions('secretary:read')
export class SecretaryCommandController {
  constructor(private readonly service: SecretaryCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('visitors')
  getVisitors() {
    return this.service.getVisitors();
  }

  @Post('visitors/check-in')
  @Permissions('secretary:write')
  checkInVisitor(@Body() dto: any) {
    return this.service.checkInVisitor(dto);
  }

  @Post('visitors/:id/check-out')
  @Permissions('secretary:write')
  checkOutVisitor(@Param('id') id: string) {
    return this.service.checkOutVisitor(id);
  }

  @Post('visitors/:id/print-slip')
  @Permissions('secretary:write')
  printVisitorSlip(@Param('id') id: string) {
    return this.service.printVisitorSlip(id);
  }

  @Get('appointments')
  getAppointments() {
    return this.service.getAppointments();
  }

  @Post('appointments')
  @Permissions('secretary:write')
  createAppointment(@Body() dto: any) {
    return this.service.createAppointment(dto);
  }

  @Post('appointments/:id/cancel')
  @Permissions('secretary:write')
  cancelAppointment(@Param('id') id: string) {
    return this.service.updateAppointmentStatus(id, 'cancelled');
  }

  @Post('appointments/:id/reschedule')
  @Permissions('secretary:write')
  rescheduleAppointment(@Param('id') id: string, @Body() dto: any) {
    return this.service.rescheduleAppointment(id, dto);
  }

  @Post('appointments/:id/confirm')
  @Permissions('secretary:write')
  confirmAppointment(@Param('id') id: string) {
    return this.service.updateAppointmentStatus(id, 'confirmed');
  }

  @Get('calls-log')
  getCallsLog() {
    return this.service.getCallsLog();
  }

  @Post('calls-log')
  @Permissions('secretary:write')
  logCall(@Body() dto: any) {
    return this.service.logCall(dto);
  }

  @Post('calls-log/:id/follow-up')
  @Permissions('secretary:write')
  markCallFollowedUp(@Param('id') id: string) {
    return this.service.completeWorkflowEvent(id, 'frontoffice.call_followed_up', 'frontoffice.call_logged');
  }

  @Get('reception-queue')
  getReceptionQueue() {
    return this.service.getReceptionQueue();
  }

  @Post('reception-queue')
  @Permissions('secretary:write')
  createQueueEntry(@Body() dto: any) {
    return this.service.createQueueEntry(dto);
  }

  @Post('reception-queue/:id/call')
  @Permissions('secretary:write')
  callNextInQueue(@Param('id') id: string) {
    return this.service.updateWorkflowEventStatus(id, 'called', 'frontoffice.queue_called', {}, 'frontoffice.queue_entry');
  }

  @Post('reception-queue/:id/complete')
  @Permissions('secretary:write')
  completeQueueEntry(@Param('id') id: string) {
    return this.service.updateWorkflowEventStatus(id, 'completed', 'frontoffice.queue_completed', {}, 'frontoffice.queue_entry');
  }

  @Get('parent-messages')
  getParentMessages() {
    return this.service.getParentMessages();
  }

  @Post('parent-messages')
  @Permissions('secretary:write')
  sendParentMessage(@Body() dto: any) {
    return this.service.sendParentMessage(dto);
  }

  @Post('parent-messages/:id/read')
  @Permissions('secretary:write')
  markMessageRead(@Param('id') id: string) {
    return this.service.updateWorkflowEventStatus(id, 'read', 'frontoffice.parent_message_read', {}, 'frontoffice.parent_message');
  }

  @Post('parent-messages/:id/reply')
  @Permissions('secretary:write')
  replyToMessage(@Param('id') id: string, @Body() dto: any) {
    return this.service.replyToMessage(id, dto);
  }

  @Post('parent-messages/:id/assign')
  @Permissions('secretary:write')
  assignParentMessage(@Param('id') id: string, @Body() dto: any) {
    return this.service.assignParentMessage(id, dto);
  }

  @Get('lost-found')
  getLostFoundItems() {
    return this.service.getLostFoundItems();
  }

  @Post('lost-found')
  @Permissions('secretary:write')
  recordLostFoundItem(@Body() dto: any) {
    return this.service.recordLostFoundItem(dto);
  }

  @Get('preferences')
  getPreferences() {
    return this.service.getPreferences();
  }

  @Post('preferences')
  @Permissions('secretary:write')
  updatePreferences(@Body() dto: any) {
    return this.service.updatePreferences(dto);
  }

  @Get('letters-documents')
  getLettersDocuments() {
    return this.service.getLettersDocuments();
  }

  @Post('letters-documents')
  @Permissions('secretary:write')
  createDocument(@Body() dto: any) {
    return this.service.createDocument(dto);
  }

  @Post('letters-documents/:id/download')
  downloadDocument(@Param('id') id: string) {
    return this.service.getDocumentArtifact(id, 'download');
  }

  @Post('letters-documents/:id/print')
  printDocument(@Param('id') id: string) {
    return this.service.getDocumentArtifact(id, 'print');
  }

  @Get('mail-parcels')
  getMailParcels() {
    return this.service.getMailParcels();
  }

  @Post('mail-parcels')
  @Permissions('secretary:write')
  recordMailParcel(@Body() dto: any) {
    return this.service.recordMailParcel(dto);
  }

  @Post('mail-parcels/:id/notify')
  @Permissions('secretary:write')
  notifyMailParcelRecipient(@Param('id') id: string) {
    return this.service.notifyMailParcelRecipient(id);
  }

  @Post('mail-parcels/:id/collect')
  @Permissions('secretary:write')
  collectMailParcel(@Param('id') id: string) {
    return this.service.collectMailParcel(id);
  }

  @Get('student-clearance')
  getStudentClearance() {
    return this.service.getStudentClearance();
  }

  @Post('student-clearance')
  @Permissions('secretary:write')
  initiateClearance(@Body() dto: any) {
    return this.service.initiateClearance(dto);
  }

  @Post('student-clearance/:id/approve')
  @Permissions('secretary:write')
  approveClearanceStep(@Param('id') id: string, @Body() dto: any) {
    return this.service.approveClearanceStep(id, dto);
  }

  @Post('student-clearance/:id/complete')
  @Permissions('secretary:write')
  completeClearance(@Param('id') id: string) {
    return this.service.updateWorkflowEventStatus(id, 'completed', 'frontoffice.clearance_completed', {}, 'frontoffice.clearance_started');
  }

  @Post('student-clearance/:id/print')
  printClearanceForm(@Param('id') id: string) {
    return this.service.getDocumentArtifact(id, 'print');
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('secretary:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Post('reports/:id/download')
  downloadReport(@Param('id') id: string) {
    return this.service.downloadReport(id);
  }

  @Post('actions')
  @Permissions('secretary:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }
}
