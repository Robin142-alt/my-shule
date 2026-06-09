import { Body, Controller, Get, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { type AutoRepairSystemSnapshot } from './auto-repair-agent';
import { AutoRepairService } from './auto-repair.service';

@Controller('auto-repair')
export class AutoRepairController {
  constructor(private readonly autoRepairService: AutoRepairService) {}

  @Get('health')
  @Permissions('platform:auto-repair')
  getDeploymentHealth() {
    return this.autoRepairService.getDeploymentHealth();
  }

  @Post('dashboard/snapshot')
  @Permissions('platform:auto-repair')
  repairDashboardSnapshot(@Body() snapshot: AutoRepairSystemSnapshot) {
    return this.autoRepairService.repairDashboardSnapshot(snapshot);
  }
}
