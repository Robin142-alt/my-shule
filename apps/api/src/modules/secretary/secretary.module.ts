import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SecretaryController } from './secretary.controller';
import { SecretaryService } from './secretary.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SecretaryController],
  providers: [SecretaryService],
  exports: [SecretaryService],
})
export class SecretaryModule {}
