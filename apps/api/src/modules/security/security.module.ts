import { Global, Module } from '@nestjs/common';

import { RedisModule } from '../../infrastructure/redis/redis.module';
import { ObservabilityModule } from '../observability/observability.module';
import { DataClassificationRegistryService } from './data-classification-registry.service';
import { FraudDetectionService } from './fraud-detection.service';
import { PiiEncryptionService } from './pii-encryption.service';
import { PiiLeakScannerService } from './pii-leak-scanner.service';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  imports: [RedisModule, ObservabilityModule],
  providers: [
    PiiEncryptionService,
    RateLimitService,
    FraudDetectionService,
    DataClassificationRegistryService,
    PiiLeakScannerService,
  ],
  exports: [
    PiiEncryptionService,
    RateLimitService,
    FraudDetectionService,
    DataClassificationRegistryService,
    PiiLeakScannerService,
  ],
})
export class SecurityModule {}
