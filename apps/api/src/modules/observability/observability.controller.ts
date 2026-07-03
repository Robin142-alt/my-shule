import { Controller, Get, Query } from '@nestjs/common';

import { Public } from '../../auth/decorators/public.decorator';
import { SloMetricsService } from './slo-metrics.service';
import { SloMonitoringService } from './slo-monitoring.service';

@Public()
@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly sloMonitoringService: SloMonitoringService,
    private readonly sloMetricsService: SloMetricsService,
  ) {}

  @Get('slos')
  getSloCatalog() {
    return {
      subsystem_count: 4,
      objectives: this.sloMonitoringService.getSloCatalog(),
    };
  }

  @Get('dashboard')
  async getDashboard() {
    return this.sloMonitoringService.getDashboard();
  }

  @Get('metrics')
  async getMetrics() {
    return this.sloMonitoringService.getMetrics();
  }

  @Get('alerts')
  async getAlerts() {
    return {
      alerts: await this.sloMonitoringService.getAlerts(),
    };
  }

  @Get('api-failures')
  getRecentApiFailures(@Query('limit') limit?: string) {
    return {
      failures: this.sloMetricsService.getRecentApiFailures(Number(limit ?? 20)),
    };
  }

  @Get('health')
  async getHealth() {
    return this.sloMonitoringService.getRealtimeHealth();
  }
}
