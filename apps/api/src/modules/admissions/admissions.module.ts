import * as moduleConsumers from './consumers';
import { Module, forwardRef } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { AgpModule } from '../../common/platform-governance/agp.module';
import { StudentsModule } from '../students/students.module';
import { CommunicationModule } from '../communication/communication.module';
import { AdmissionsController } from './admissions.controller';
import { StudentRecordsController } from './student-records.controller';
import { StudentRecordsService } from './student-records.service';
import { AdmissionsSchemaService } from './admissions-schema.service';
import { AdmissionsService } from './admissions.service';
import { CohortPromotionService } from './cohort-promotion.service';
import { AdmissionsRepository } from './repositories/admissions.repository';
import { AdmissionDocumentStorageService } from './storage/local-document-storage.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    EventsModule,
    AgpModule,
    CommunicationModule,
    forwardRef(() => StudentsModule),
  ],
  controllers: [AdmissionsController, StudentRecordsController],
  providers: [
    ...Object.values(moduleConsumers),
    AdmissionsSchemaService,
    AdmissionsService,
    StudentRecordsService,
    CohortPromotionService,
    AdmissionsRepository,
    AdmissionDocumentStorageService,
  ],
  exports: [AdmissionsService, AdmissionsRepository, CohortPromotionService],
})
export class AdmissionsModule {}
