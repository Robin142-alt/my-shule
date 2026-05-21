import { Module } from '@nestjs/common';

import { AssetsController } from './assets.controller';
import { AssetsSchemaService } from './assets-schema.service';
import { AssetsService } from './assets.service';
import { AssetsRepository } from './repositories/assets.repository';

@Module({
  controllers: [AssetsController],
  providers: [AssetsSchemaService, AssetsService, AssetsRepository],
  exports: [AssetsService, AssetsRepository],
})
export class AssetsModule {}
