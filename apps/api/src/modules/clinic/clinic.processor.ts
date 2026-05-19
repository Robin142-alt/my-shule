import { Injectable, Logger, Optional } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ModuleAccessService } from '../module-access/module-access.service';
import { ClinicRepository } from './repositories/clinic.repository';

@Injectable()
export class ClinicInventoryProcessor {
  private readonly logger = new Logger(ClinicInventoryProcessor.name);

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: ClinicRepository,
    @Optional()
    private readonly moduleAccessService?: ModuleAccessService,
  ) {}

  async runTenantMedicineExpiryCheck(tenantId: string) {
    return this.runAsSystem(tenantId, async () => {
      await this.repository.markExpiryStatuses(tenantId);
      const alerts = await this.repository.createExpiryAlerts(tenantId);
      this.logger.log(`Clinic expiry check created ${alerts.length} alerts for ${tenantId}`);

      return { tenant_id: tenantId, alerts_created: alerts.length };
    });
  }

  async runTenantLowStockCheck(tenantId: string) {
    return this.runAsSystem(tenantId, async () => {
      const alerts = await this.repository.createLowStockAlerts(tenantId);
      const recommendations = await this.createProcurementRecommendations(tenantId);
      this.logger.log(
        `Clinic low-stock check created ${alerts.length} alerts and ${recommendations.length} procurement recommendations for ${tenantId}`,
      );

      return {
        tenant_id: tenantId,
        alerts_created: alerts.length,
        recommendations_created: recommendations.length,
      };
    });
  }

  private async createProcurementRecommendations(tenantId: string) {
    if (!this.moduleAccessService) {
      return [];
    }

    const enabledModules = await this.moduleAccessService.listEnabledModulesForTenant(tenantId);

    if (!enabledModules.includes('procurement')) {
      return [];
    }

    const batches = await this.repository.listLowStockBatches(tenantId);
    const recommendations = [];

    for (const batch of batches) {
      const recommendation = await this.repository.createProcurementRecommendation({
        tenant_id: tenantId,
        module_code: 'clinic_health',
        medicine_id: batch.medicine_id,
        batch_id: batch.batch_id,
        item_name: batch.medicine_name,
        batch_number: batch.batch_number,
        quantity_available: batch.quantity_available,
        minimum_stock_threshold: batch.minimum_stock_threshold,
        shortage_quantity: batch.shortage_quantity,
        recommended_order_quantity: batch.recommended_order_quantity,
        metadata: {
          source: 'clinic_low_stock_processor',
          shortage_quantity: batch.shortage_quantity,
          recommended_order_quantity: batch.recommended_order_quantity,
        },
      });

      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private runAsSystem<T>(tenantId: string, callback: () => Promise<T>): Promise<T> {
    return this.requestContext.run(
      {
        request_id: `clinic-job-${Date.now()}`,
        tenant_id: tenantId,
        user_id: '00000000-0000-0000-0000-000000000000',
        role: 'system',
        session_id: null,
        permissions: ['*:*'],
        is_authenticated: true,
        client_ip: null,
        user_agent: 'clinic-inventory-processor',
        method: 'JOB',
        path: '/jobs/clinic-inventory',
        started_at: new Date().toISOString(),
      },
      callback,
    );
  }
}
