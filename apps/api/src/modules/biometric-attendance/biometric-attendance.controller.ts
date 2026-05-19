import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  EnrollBiometricIdentityDto,
  ManualTeacherAttendanceOverrideDto,
  RegisterBiometricDeviceDto,
  SyncBiometricEventsDto,
} from './dto/biometric-attendance.dto';
import { BiometricAttendanceService } from './biometric-attendance.service';

@Controller('biometric-attendance')
@RequiresModule('teacher_biometric_attendance')
export class BiometricAttendanceController {
  constructor(private readonly biometricAttendanceService: BiometricAttendanceService) {}

  @Post('devices')
  @Permissions('teacher_attendance:devices')
  registerDevice(@Body() dto: RegisterBiometricDeviceDto) {
    return this.biometricAttendanceService.registerDevice(dto);
  }

  @Post('identities')
  @Permissions('teacher_attendance:devices')
  enrollIdentity(@Body() dto: EnrollBiometricIdentityDto) {
    return this.biometricAttendanceService.enrollIdentity(dto);
  }

  @Post('events/sync')
  @Permissions('teacher_attendance:devices')
  syncEvents(@Body() dto: SyncBiometricEventsDto) {
    return this.biometricAttendanceService.syncEvents(dto);
  }

  @Get('teacher-logs')
  @Permissions('teacher_attendance:read')
  listTeacherLogs(@Query('teacher_user_id') teacherUserId?: string) {
    return this.biometricAttendanceService.listTeacherLogs(teacherUserId);
  }

  @Get('live-feed')
  @Permissions('teacher_attendance:read')
  listLiveFeed(@Query('limit') limit?: string) {
    return this.biometricAttendanceService.listLiveFeed(limit);
  }

  @Get('reports/monthly')
  @Permissions('teacher_attendance:read')
  getMonthlyReport(@Query('month') month?: string) {
    return this.biometricAttendanceService.getMonthlyReport(month);
  }

  @Post('manual-overrides')
  @Permissions('teacher_attendance:override')
  createManualOverride(@Body() dto: ManualTeacherAttendanceOverrideDto) {
    return this.biometricAttendanceService.createManualOverride(dto);
  }
}
