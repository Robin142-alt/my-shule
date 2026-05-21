import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { CbtService } from './cbt.service';

@Controller('cbt')
@RequiresModule('cbt_exams')
export class CbtController {
  constructor(private readonly cbtService: CbtService) {}

  @Get('dashboard')
  @Permissions('cbt:read')
  getDashboard() {
    return this.cbtService.getDashboard();
  }

  @Post('records')
  @Permissions('cbt:write')
  createRecord(@Body() dto: SimpleOperationsRecordDto) {
    return this.cbtService.createRecord(dto);
  }

  @Patch('records/:recordId/status')
  @Permissions('cbt:write')
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: SimpleOperationsStatusDto,
  ) {
    return this.cbtService.updateStatus(recordId, dto);
  }
}
