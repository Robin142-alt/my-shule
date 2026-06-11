import { Module } from '@nestjs/common';
import { CounsellingController } from './counselling.controller';
import { CounsellingService } from './counselling.service';

@Module({
  controllers: [CounsellingController],
  providers: [CounsellingService],
  exports: [CounsellingService],
})
export class CounsellingModule {}
