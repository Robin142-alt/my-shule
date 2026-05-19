import { Module } from '@nestjs/common';

import { StudentsModule } from '../students/students.module';
import { ClinicController } from './clinic.controller';
import { ClinicInventoryProcessor } from './clinic.processor';
import { ClinicSchemaService } from './clinic-schema.service';
import { ClinicService } from './clinic.service';
import { ClinicRepository } from './repositories/clinic.repository';

@Module({
  imports: [StudentsModule],
  controllers: [ClinicController],
  providers: [
    ClinicSchemaService,
    ClinicRepository,
    ClinicService,
    ClinicInventoryProcessor,
  ],
  exports: [ClinicService, ClinicRepository, ClinicInventoryProcessor],
})
export class ClinicModule {}
