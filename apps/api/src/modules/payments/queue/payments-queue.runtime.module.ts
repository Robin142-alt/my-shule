import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';

import configuration from '../../../config/configuration';
import { RedisModule } from '../../../infrastructure/redis/redis.module';
import { QueueModule } from '../../../queue/queue.module';
import { PAYMENTS_QUEUE_NAME } from '../payments.constants';
import { validatePaymentsQueueEnv } from './payments-queue.env';
import { PaymentsQueueModule } from './payments-queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configuration],
      validate: validatePaymentsQueueEnv,
    }),
    RedisModule,
    QueueModule,
    BullModule.registerQueue({
      name: PAYMENTS_QUEUE_NAME,
    }),
    PaymentsQueueModule,
  ],
  exports: [PaymentsQueueModule],
})
export class PaymentsQueueRuntimeModule {}
