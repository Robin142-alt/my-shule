import { Global, Module } from '@nestjs/common';

import { RedisModule } from '../../infrastructure/redis/redis.module';
import { ObservabilityModule } from '../observability/observability.module';
import { DataClassificationRegistryService } from './data-classification-registry.service';
import { FraudDetectionService } from './fraud-detection.service';
import { PiiEncryptionService } from './pii-encryption.service';
import { PiiLeakScannerService } from './pii-leak-scanner.service';
import { RateLimitService } from './rate-limit.service';
import { SecurityOperationsController } from './security-operations.controller';
import { SecurityOperationsService } from './security-operations.service';
import { VisitorsModule } from '../visitors/visitors.module';

@Global()
@Module({
  imports: [RedisModule, ObservabilityModule, VisitorsModule],
  controllers: [SecurityOperationsController],
  providers: [
    PiiEncryptionService,
    RateLimitService,
    FraudDetectionService,
    DataClassificationRegistryService,
    PiiLeakScannerService,
    SecurityOperationsService,
  ],
  exports: [
    PiiEncryptionService,
    RateLimitService,
    FraudDetectionService,
    DataClassificationRegistryService,
    PiiLeakScannerService,
    SecurityOperationsService,
  ],
})
export class SecurityModule {}
