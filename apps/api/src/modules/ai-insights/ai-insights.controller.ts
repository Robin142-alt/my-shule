import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { AiInsightsService } from './ai-insights.service';

@Controller('ai-insights')
@RequiresModule('ai_insights')
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  @Get('dashboard')
  @Permissions('ai-insights:read')
  getDashboard() {
    return this.aiInsightsService.getDashboard();
  }

  @Post('records')
  @Permissions('ai-insights:write')
  createRecord(@Body() dto: SimpleOperationsRecordDto) {
    return this.aiInsightsService.createRecord(dto);
  }

  @Patch('records/:recordId/status')
  @Permissions('ai-insights:write')
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: SimpleOperationsStatusDto,
  ) {
    return this.aiInsightsService.updateStatus(recordId, dto);
  }
}
