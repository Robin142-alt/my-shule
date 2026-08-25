import { Module } from '@nestjs/common';

import { ProcurementRepository } from './repositories/procurement.repository';
import { ProcurementController } from './procurement.controller';
import { ProcurementSchemaService } from './procurement-schema.service';
import { ProcurementService } from './procurement.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [ProcurementController],
  providers: [
    ProcurementSchemaService,
    ProcurementService,
    ProcurementRepository,
  ],
  exports: [ProcurementService, ProcurementRepository],
})
export class ProcurementModule {}
