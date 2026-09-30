import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { SecurityModule } from '../security/security.module';
import { TenantFinanceConfigRepository } from './tenant-finance-config.repository';
import { TenantFinanceConfigService } from './tenant-finance-config.service';
import { TenantFinanceController } from './tenant-finance.controller';
import { TenantFinanceSchemaService } from './tenant-finance-schema.service';
import { PaymentChannelWorkflowSchemaService } from './payment-channel-workflow-schema.service';
import { PaymentChannelWorkflowService } from './payment-channel-workflow.service';
import { PaymentChannelConnectionService } from './payment-channel-connection.service';
import { PaymentIngressConfigService } from './payment-ingress-config.service';
import { PaymentChannelWorkflowController, PlatformPaymentIntegrationsController } from './payment-channel-workflow.controller';

@Module({
  imports: [AuthModule, ObservabilityModule, SecurityModule],
  controllers: [TenantFinanceController, PaymentChannelWorkflowController, PlatformPaymentIntegrationsController],
  providers: [
    TenantFinanceSchemaService,
    TenantFinanceConfigRepository,
    TenantFinanceConfigService,
    PaymentChannelWorkflowSchemaService,
    PaymentChannelWorkflowService,
    PaymentChannelConnectionService,
    PaymentIngressConfigService,
  ],
  exports: [
    PaymentIngressConfigService,
    TenantFinanceSchemaService,
    TenantFinanceConfigRepository,
    TenantFinanceConfigService,
    PaymentChannelWorkflowSchemaService,
  ],
})
export class TenantFinanceModule {}
