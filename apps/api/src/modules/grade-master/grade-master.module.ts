import { Module } from '@nestjs/common';
import { GradeMasterController } from './grade-master.controller';
import { GradeMasterService } from './grade-master.service';

@Module({
  controllers: [GradeMasterController],
  providers: [GradeMasterService],
  exports: [GradeMasterService],
})
export class GradeMasterModule {}
