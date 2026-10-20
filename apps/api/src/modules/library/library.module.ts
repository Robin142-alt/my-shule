import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';

import { LibraryController } from './library.controller';
import { LibrarySchemaService } from './library-schema.service';
import { LibraryService } from './library.service';
import { LibraryRepository } from './repositories/library.repository';
import { SmartLibraryService } from './smart-library.service';
import { SmartLibraryController } from './smart-library.controller';

@Module({
  imports: [EventsModule],
  controllers: [LibraryController, SmartLibraryController],
  providers: [
    LibrarySchemaService,
    LibraryService,
    LibraryRepository,
    SmartLibraryService,
  ],
  exports: [LibraryService, LibraryRepository, SmartLibraryService],
})
export class LibraryModule {}
