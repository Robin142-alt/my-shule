import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';

import { InventoryController } from './inventory.controller';
import { InventorySchemaService } from './inventory-schema.service';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';

@Module({
  imports: [EventsModule],
  controllers: [InventoryController],
  providers: [
    ...Object.values(moduleConsumers),
    InventorySchemaService,
    InventoryService,
    InventoryRepository,
  ],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
