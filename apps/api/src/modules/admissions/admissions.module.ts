import * as moduleConsumers from './consumers';
import { Module, forwardRef } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { AgpModule } from '../../common/platform-governance/agp.module';
import { StudentsModule } from '../students/students.module';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsSchemaService } from './admissions-schema.service';
import { AdmissionsService } from './admissions.service';
import { AdmissionsRepository } from './repositories/admissions.repository';
import { AdmissionDocumentStorageService } from './storage/local-document-storage.service';

@Module({
  imports: [DatabaseModule, AuthModule, EventsModule, AgpModule, forwardRef(() => StudentsModule)],
  controllers: [AdmissionsController],
  providers: [
    ...Object.values(moduleConsumers),
    AdmissionsSchemaService,
    AdmissionsService,
    AdmissionsRepository,
    AdmissionDocumentStorageService,
  ],
  exports: [AdmissionsService, AdmissionsRepository],
})
export class AdmissionsModule {}
