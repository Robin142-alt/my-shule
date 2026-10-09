import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';
import { LegalSchemaService } from './legal-schema.service';
import { LegalVerificationService } from './legal-verification.service';

@Module({ imports: [AuthModule, DatabaseModule], controllers: [LegalController], providers: [LegalService, LegalSchemaService, LegalVerificationService], exports: [LegalService] })
export class LegalModule {}
