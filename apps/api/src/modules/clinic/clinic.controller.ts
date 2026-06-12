import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClinicService } from './clinic.service';
import {
  CreateMedicineDto,
  DispenseMedicineDto,
  ListClinicMedicinesQueryDto,
  ReceiveMedicineStockDto,
  RecordClinicVisitDto,
} from './dto/clinic.dto';

@Controller('clinic')
@RequiresModule('clinic_health')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post('medicines')
  @Permissions('clinic:inventory')
  createMedicine(@Body() dto: CreateMedicineDto) {
    return this.clinicService.createMedicine(dto);
  }

  @Get('medicines')
  @Permissions('clinic:read')
  listMedicines(@Query() query: ListClinicMedicinesQueryDto) {
    return this.clinicService.listMedicines(query);
  }

  @Post('medicines/:medicineId/stock')
  @Permissions('clinic:inventory')
  receiveMedicineStock(
    @Param('medicineId') medicineId: string,
    @Body() dto: ReceiveMedicineStockDto,
  ) {
    return this.clinicService.receiveMedicineStock(medicineId, dto);
  }

  @Get('visits')
  @Permissions('clinic:read')
  listVisits() {
    return this.clinicService.listVisits();
  }

  @Post('visits')
  @Permissions('clinic:write')
  recordVisit(@Body() dto: RecordClinicVisitDto) {
    return this.clinicService.recordVisit(dto);
  }

  @Post('visits/:visitId/dispense')
  @Permissions('clinic:dispense')
  dispenseMedicine(
    @Param('visitId') visitId: string,
    @Body() dto: DispenseMedicineDto,
  ) {
    return this.clinicService.dispenseMedicine(visitId, dto);
  }

  @Get('analytics/principal')
  @Permissions('clinic:reports')
  getPrincipalAnalytics() {
    return this.clinicService.getPrincipalAnalytics();
  }

  @Get('summary')
  @Permissions('clinic:read')
  getSummary() {
    return this.clinicService.getSummary();
  }

  @Get('parent/students/:studentId/history')
  @Permissions('portal:read_own_children')
  getParentMedicalHistory(@Param('studentId') studentId: string) {
    return this.clinicService.getParentMedicalHistory(studentId);
  }

  @Post('jobs/expiry-check')
  @Permissions('clinic:inventory')
  runMedicineExpiryCheck() {
    return this.clinicService.runMedicineExpiryCheck();
  }

  @Post('jobs/low-stock-check')
  @Permissions('clinic:inventory')
  runLowStockCheck() {
    return this.clinicService.runLowStockCheck();
  }

  @Get('emergencies')
  @Permissions('clinic:read')
  listEmergencies() {
    return this.clinicService.listEmergencies();
  }

  @Post('emergencies')
  @Permissions('clinic:write')
  recordEmergency(@Body() dto: Record<string, any>) {
    return this.clinicService.recordEmergency(dto);
  }

  @Get('referrals')
  @Permissions('clinic:read')
  listReferrals() {
    return this.clinicService.listReferrals();
  }

  @Post('referrals')
  @Permissions('clinic:write')
  createReferral(@Body() dto: Record<string, any>) {
    return this.clinicService.createReferral(dto);
  }

  @Get('queue')
  @Permissions('clinic:read')
  getSickBayQueue() {
    return this.clinicService.getSickBayQueue();
  }

  @Post('queue')
  @Permissions('clinic:write')
  addToQueue(@Body() dto: Record<string, any>) {
    return this.clinicService.addToQueue(dto);
  }
}
