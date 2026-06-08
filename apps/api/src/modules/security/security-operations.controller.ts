import { Body, Controller, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SecurityOperationsService } from './security-operations.service';
import { CreateSecurityIncidentDto, CreatePanicAlertDto, CreateVisitorDto } from './security-operations.dto';

@Controller('security')
export class SecurityOperationsController {
  constructor(private readonly securityOperationsService: SecurityOperationsService) {}

  @Post('incidents')
  @Permissions('security:write')
  async createIncident(@Body() dto: CreateSecurityIncidentDto) {
    return this.securityOperationsService.reportIncident(dto);
  }

  @Post('panic-alert')
  @Permissions('security:write')
  async triggerPanicAlert(@Body() dto: CreatePanicAlertDto) {
    return this.securityOperationsService.triggerPanicAlert(dto);
  }

  @Post('visitors')
  @Permissions('visitors:write')
  async createVisitor(@Body() dto: CreateVisitorDto) {
    return this.securityOperationsService.createVisitorRecord(dto);
  }
}
