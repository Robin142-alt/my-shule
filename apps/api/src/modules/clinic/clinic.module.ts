import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';

import { StudentsModule } from '../students/students.module';
import { ClinicController } from './clinic.controller';
import { ClinicInventoryProcessor } from './clinic.processor';
import { ClinicSchemaService } from './clinic-schema.service';
import { ClinicService } from './clinic.service';
import { ClinicRepository } from './repositories/clinic.repository';

@Module({
  
  imports: [StudentsModule, EventsModule],
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
