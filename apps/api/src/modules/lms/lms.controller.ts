import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { LmsService } from './lms.service';

@Controller('lms')
@RequiresModule('lms')
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  @Get('dashboard')
  @Permissions('lms:read')
  getDashboard() {
    return this.lmsService.getDashboard();
  }

  @Post('records')
  @Permissions('lms:write')
  createRecord(@Body() dto: SimpleOperationsRecordDto) {
    return this.lmsService.createRecord(dto);
  }

  @Patch('records/:recordId/status')
  @Permissions('lms:write')
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: SimpleOperationsStatusDto,
  ) {
    return this.lmsService.updateStatus(recordId, dto);
  }
}
