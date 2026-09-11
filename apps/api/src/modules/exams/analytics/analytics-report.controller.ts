import { Body, Controller, Header, Post } from '@nestjs/common';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../../module-access/module-access.decorator';
import { AnalyticsReportService } from './analytics-report.service';

@Controller('exams/analytics')
@RequiresModule('exams')
export class AnalyticsReportController {
  constructor(private readonly reports:AnalyticsReportService) {}
  @Post('reports')
  @Permissions('exams:read')
  @Header('Cache-Control','private, no-store')
  generate(@Body() input:unknown) {return this.reports.generate(input);}
}
