import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { LibrarianCommandService } from './librarian-command.service';

@Controller('admin-command/librarian')
@RequiresModule('library')
@Permissions('library:read')
export class LibrarianCommandController {
  constructor(private readonly service: LibrarianCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('books')
  getBooks() {
    return this.service.getBooks();
  }

  @Get('borrowers')
  getBorrowers() {
    return this.service.getBorrowers();
  }

  @Get('issue-book')
  getIssueBook() {
    return this.service.getIssueBook();
  }

  @Get('return-book')
  getReturnBook() {
    return this.service.getReturnBook();
  }

  @Get('overdue-books')
  getOverdueBooks() {
    return this.service.getOverdueBooks();
  }

  @Get('fines-lost-damaged')
  getFinesLostDamaged() {
    return this.service.getFinesLostDamaged();
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
}
