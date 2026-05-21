import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { HostelService } from './hostel.service';

@Controller('hostel')
@RequiresModule('hostel')
export class HostelController {
  constructor(private readonly hostelService: HostelService) {}

  @Get('dashboard')
  @Permissions('hostel:read')
  getDashboard() {
    return this.hostelService.getDashboard();
  }

  @Post('records')
  @Permissions('hostel:write')
  createRecord(@Body() dto: SimpleOperationsRecordDto) {
    return this.hostelService.createRecord(dto);
  }

  @Patch('records/:recordId/status')
  @Permissions('hostel:write')
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: SimpleOperationsStatusDto,
  ) {
    return this.hostelService.updateStatus(recordId, dto);
  }
}
