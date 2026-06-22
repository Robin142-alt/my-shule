import * as moduleConsumers from './consumers';
import { EventsModule } from '../events/events.module';
import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';

import { DisciplineController } from './discipline.controller';
import { CounsellingController } from './counselling.controller';
import { CounsellingNoteEncryptionService } from './counselling-note-encryption.service';
import { CounsellingRepository } from './repositories/counselling.repository';
import { DisciplineRepository } from './repositories/discipline.repository';
import { DisciplineDocumentService } from './discipline-document.service';
import { DisciplineNotificationService } from './discipline-notification.service';
import { DisciplineSchemaService } from './discipline-schema.service';
import { CounsellingService } from './counselling.service';
import { DisciplineService } from './discipline.service';
import { DisciplineAttachmentStorageService } from './storage/discipline-attachment-storage.service';
import { DisciplineApprovalsHandler } from './discipline-approvals.handler';

@Module({
  imports: [EventsModule, ApprovalsModule],
  controllers: [DisciplineController, CounsellingController],
  providers: [
    ...Object.values(moduleConsumers),
    DisciplineSchemaService,
    DisciplineRepository,
    CounsellingRepository,
    CounsellingNoteEncryptionService,
    DisciplineAttachmentStorageService,
    DisciplineNotificationService,
    DisciplineDocumentService,
    DisciplineService,
    CounsellingService,
    DisciplineApprovalsHandler,
  ],
  exports: [DisciplineService, CounsellingService],
})
export class DisciplineModule {}
