import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { AssetsService } from './assets.service';

@Controller('assets')
@RequiresModule('asset_tracking')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('dashboard')
  @Permissions('assets:read')
  getDashboard() {
    return this.assetsService.getDashboard();
  }

  @Post('records')
  @Permissions('assets:write')
  createRecord(@Body() dto: SimpleOperationsRecordDto) {
    return this.assetsService.createRecord(dto);
  }

  @Patch('records/:recordId/status')
  @Permissions('assets:write')
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: SimpleOperationsStatusDto,
  ) {
    return this.assetsService.updateStatus(recordId, dto);
  }
}
