import { Module } from '@nestjs/common';

import { BiometricAttendanceController } from './biometric-attendance.controller';
import { BiometricAttendanceProcessor } from './biometric-attendance.processor';
import { BiometricAttendanceSchemaService } from './biometric-attendance-schema.service';
import { BiometricAttendanceService } from './biometric-attendance.service';
import { BiometricAttendanceRepository } from './repositories/biometric-attendance.repository';

@Module({
  controllers: [BiometricAttendanceController],
  providers: [
    BiometricAttendanceSchemaService,
    BiometricAttendanceRepository,
    BiometricAttendanceService,
    BiometricAttendanceProcessor,
  ],
  exports: [BiometricAttendanceRepository, BiometricAttendanceService, BiometricAttendanceProcessor],
})
export class BiometricAttendanceModule {}
