import { Module } from '@nestjs/common';

import { CbtController } from './cbt.controller';
import { CbtSchemaService } from './cbt-schema.service';
import { CbtService } from './cbt.service';
import { CbtRepository } from './repositories/cbt.repository';

@Module({
  controllers: [CbtController],
  providers: [CbtSchemaService, CbtService, CbtRepository],
  exports: [CbtService, CbtRepository],
})
export class CbtModule {}
