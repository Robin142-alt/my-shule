import { Body, Controller, Get, Param, Post, InternalServerErrorException } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  ChemicalDisposalRequestDto,
  CreateChemicalItemDto,
  CreateLabDepartmentDto,
  CreateLabDto,
  CreateLabEquipmentDto,
  CreateLabSessionDto,
  IssueChemicalDto,
  IssueEquipmentDto,
  MarkLabAttendanceDto,
  ReconcileEquipmentDto,
} from './dto/labs.dto';
import { LabsService } from './labs.service';

@Controller('labs')
@RequiresModule('lab_management')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post('departments')
  @Permissions('labs:write')
  createDepartment(@Body() dto: CreateLabDepartmentDto) {
    return this.labsService.createDepartment(dto);
  }

  @Post()
  @Permissions('labs:write')
  createLab(@Body() dto: CreateLabDto) {
    return this.labsService.createLab(dto);
  }

  @Post('sessions')
  @Permissions('labs:write')
  createLabSession(@Body() dto: CreateLabSessionDto) {
    return this.labsService.createLabSession(dto);
  }

  @Post('sessions/:sessionId/attendance')
  @Permissions('labs:attendance')
  markAttendance(
    @Param('sessionId') sessionId: string,
    @Body() dto: MarkLabAttendanceDto,
  ) {
    return this.labsService.markAttendance(sessionId, dto);
  }

  @Post('equipment')
  @Permissions('labs:inventory')
  createEquipment(@Body() dto: CreateLabEquipmentDto) {
    return this.labsService.createEquipment(dto);
  }

  @Post('chemicals')
  @Permissions('labs:inventory')
  createChemical(@Body() dto: CreateChemicalItemDto) {
    return this.labsService.createChemical(dto);
  }

  @Post('sessions/:sessionId/equipment-usage')
  @Permissions('labs:inventory')
  issueEquipment(
    @Param('sessionId') sessionId: string,
    @Body() dto: IssueEquipmentDto,
  ) {
    return this.labsService.issueEquipment(sessionId, dto);
  }

  @Post('equipment-usage/:usageId/reconcile')
  @Permissions('labs:inventory')
  reconcileEquipment(
    @Param('usageId') usageId: string,
    @Body() dto: ReconcileEquipmentDto,
  ) {
    return this.labsService.reconcileEquipment(usageId, dto);
  }

  @Post('sessions/:sessionId/chemical-usage')
  @Permissions('labs:inventory')
  issueChemical(
    @Param('sessionId') sessionId: string,
    @Body() dto: IssueChemicalDto,
  ) {
    return this.labsService.issueChemical(sessionId, dto);
  }

  @Post('chemicals/:chemicalId/disposal-requests')
  @Permissions('labs:inventory')
  requestChemicalDisposal(
    @Param('chemicalId') chemicalId: string,
    @Body() dto: ChemicalDisposalRequestDto,
  ) {
    return this.labsService.requestChemicalDisposal(chemicalId, dto);
  }

  @Post('disposal-requests/:requestId/approve')
  @Permissions('labs:approve-disposal')
  approveChemicalDisposal(@Param('requestId') requestId: string) {
    return this.labsService.approveChemicalDisposal(requestId);
  }

  @Post('sessions/:sessionId/complete')
  @Permissions('labs:write')
  completeLabSession(@Param('sessionId') sessionId: string) {
    return this.labsService.completeLabSession(sessionId);
  }

  @Get('dashboard')
  @Permissions('labs:read')
  getDashboard() {
    return this.labsService.getDashboard();
  }

  @Get('inventory')
  @Permissions('labs:read')
  getInventory() {
    return this.labsService.getInventory();
  }

  @Get('requests')
  @Permissions('labs:read')
  getRequests() {
    return this.labsService.getRequests();
  }

  @Get('issues')
  @Permissions('labs:read')
  getIssues() {
    return this.labsService.getIssues();
  }
}
