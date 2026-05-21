import { Module } from '@nestjs/common';

import { ProcurementRepository } from './repositories/procurement.repository';
import { ProcurementController } from './procurement.controller';
import { ProcurementSchemaService } from './procurement-schema.service';
import { ProcurementService } from './procurement.service';

@Module({
  controllers: [ProcurementController],
  providers: [
    ProcurementSchemaService,
    ProcurementService,
    ProcurementRepository,
  ],
  exports: [ProcurementService, ProcurementRepository],
})
export class ProcurementModule {}
