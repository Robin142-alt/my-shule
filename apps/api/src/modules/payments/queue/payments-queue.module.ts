import { Module } from '@nestjs/common';

import { QueueModule } from '../../../queue/queue.module';
import { PaymentsJobProducerService } from '../services/payments-job-producer.service';

@Module({
  imports: [QueueModule],
  providers: [PaymentsJobProducerService],
  exports: [PaymentsJobProducerService],
})
export class PaymentsQueueModule {}
