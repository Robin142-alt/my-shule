import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { BoardingService } from './boarding.service';

@Controller('boarding')
@RequiresModule('boarding')
export class BoardingController {
  constructor(private readonly boardingService: BoardingService) {}

  @Get('dashboard')
  @Permissions('boarding:read')
  getDashboard() {
    return this.boardingService.getDashboard();
  }

  @Post('records')
  @Permissions('boarding:write')
  createRecord(@Body() dto: SimpleOperationsRecordDto) {
    return this.boardingService.createRecord(dto);
  }

  @Patch('records/:recordId/status')
  @Permissions('boarding:write')
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: SimpleOperationsStatusDto,
  ) {
    return this.boardingService.updateStatus(recordId, dto);
  }
}
