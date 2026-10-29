import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { LibrarianCommandService } from './librarian-command.service';
import { SmartLibraryService } from '../library/smart-library.service';

@Controller('admin-command/librarian')
@RequiresModule('library')
@Permissions('library:read')
export class LibrarianCommandController {
  constructor(private readonly service: LibrarianCommandService, private readonly smartLibrary: SmartLibraryService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('books')
  getBooks() {
    return this.service.getBooks();
  }

  @Post('borrowers/report')
  @Permissions('library:read')
  borrowerReport(@Body() dto: any) { return this.service.borrowerReport(dto); }

  @Post('books')
  @Permissions('library:write')
  addBook(@Body() dto: any) {
    return this.smartLibrary.legacyAdd(dto);
  }

  @Delete('books/:id')
  @Permissions('library:write')
  deleteBook(@Param('id') id: string) {
    return this.smartLibrary.retireTitle(id);
  }

  @Get('borrowers')
  getBorrowers() {
    return this.service.getBorrowers();
  }

  @Get('circulation-options')
  getCirculationOptions() {
    return this.service.getCirculationOptions();
  }

  @Get('issue-book')
  getIssueBook() {
    return this.service.getIssueBook();
  }

  @Get('reservations')
  getReservations() {
    return this.service.getReservations();
  }

  @Post('reservations')
  @Permissions('library:write')
  createReservation(@Body() dto: any) {
    return this.service.createReservation(dto);
  }

  @Post('issue-book')
  @Permissions('library:write')
  issueBook(@Body() dto: any) {
    return this.smartLibrary.legacyIssue(dto);
  }

  @Post('department-issues')
  @Permissions('library:write')
  issueDepartmentResource(@Body() dto: any) {
    return this.smartLibrary.legacyDepartmentIssue(dto);
  }

  @Get('return-book')
  getReturnBook() {
    return this.service.getReturnBook();
  }

  @Post('return-book')
  @Permissions('library:write')
  returnBook(@Body() dto: any) {
    return this.smartLibrary.legacyReturn(dto);
  }

  @Get('overdue-books')
  getOverdueBooks() {
    return this.service.getOverdueBooks();
  }

  @Post('overdue-books/:id/remind')
  @Permissions('library:write')
  remindOverdueBorrower(@Param('id') id: string) {
    return this.service.remindOverdueBorrower(id);
  }

  @Get('fines-lost-damaged')
  getFinesLostDamaged() {
    return this.service.getFinesLostDamaged();
  }

  @Post('fines-lost-damaged')
  @Permissions('library:write')
  createFine(@Body() dto: any) {
    return this.service.createFine(dto);
  }

  @Post('fines-lost-damaged/:id/waive')
  @Permissions('library:write')
  waiveFine(@Param('id') id: string) {
    return this.service.updateFineStatus(id, 'waived');
  }

  @Post('fines-lost-damaged/:id/mark-paid')
  @Permissions('library:write')
  markFinePaid(@Param('id') id: string) {
    return this.service.updateFineStatus(id, 'paid');
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('library:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Post('reports/:id/download')
  @Permissions('library:read')
  downloadReport(@Param('id') id: string) {
    return this.service.downloadReport(id);
  }

  @Post('notices')
  @Permissions('library:write')
  sendNotice(@Body() dto: any) {
    return this.service.sendNotice(dto);
  }

  @Post('visits/checkout')
  @Permissions('library:write')
  checkoutLibraryVisit(@Body() dto: any) {
    return this.service.checkoutLibraryVisit(dto);
  }

  @Post('actions')
  @Permissions('library:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }
}
