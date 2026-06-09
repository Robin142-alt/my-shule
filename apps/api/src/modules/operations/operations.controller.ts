import { Body, Controller, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { OperationsService } from './operations.service';
import { CreateEmergencyDto, CreateAlertDto, CreateReportDto } from './operations.dto';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Post('emergency')
  @Permissions('operations:write')
  async reportEmergency(@Body() dto: CreateEmergencyDto) {
    return this.operationsService.reportEmergency(dto);
  }

  @Post('alert')
  @Permissions('operations:write')
  async createAlert(@Body() dto: CreateAlertDto) {
    return this.operationsService.createAlert(dto);
  }

  @Post('report')
  @Permissions('operations:write')
  async submitReport(@Body() dto: CreateReportDto) {
    return this.operationsService.submitReport(dto);
  }
}
