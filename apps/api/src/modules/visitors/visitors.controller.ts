import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { VisitorsService } from './visitors.service';

@Controller('visitors')
@RequiresModule('visitor_management')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get('dashboard')
  @Permissions('visitors:read')
  getDashboard() {
    return this.visitorsService.getDashboard();
  }

  @Post('records')
  @Permissions('visitors:write')
  createRecord(@Body() dto: SimpleOperationsRecordDto) {
    return this.visitorsService.createRecord(dto);
  }

  @Patch('records/:recordId/status')
  @Permissions('visitors:write')
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: SimpleOperationsStatusDto,
  ) {
    return this.visitorsService.updateStatus(recordId, dto);
  }
}
