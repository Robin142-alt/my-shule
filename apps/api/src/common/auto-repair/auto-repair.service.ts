import { Injectable, OnModuleInit } from '@nestjs/common';

import {
  repairMyShuleSnapshot,
  requiredRepairWidgetStates,
  type AutoRepairReport,
  type AutoRepairSystemSnapshot,
  type RepairWidgetState,
} from './auto-repair-agent';

export interface AutoRepairDeploymentHealth {
  agent: 'dashboard-self-healing';
  deployed: true;
  active: boolean;
  mode: 'runtime';
  score: 100;
  activatedAt: string | null;
  repairRuns: number;
  widgetStates: RepairWidgetState[];
  endpoints: string[];
}

@Injectable()
export class AutoRepairService implements OnModuleInit {
  private active = false;
  private activatedAt: string | null = null;
  private repairRuns = 0;

  onModuleInit(): void {
    this.active = true;
    this.activatedAt = new Date().toISOString();
  }

  repairDashboardSnapshot(snapshot: AutoRepairSystemSnapshot): AutoRepairReport {
    this.activateIfNeeded();
    this.repairRuns += 1;

    return repairMyShuleSnapshot(snapshot);
  }

  getDeploymentHealth(): AutoRepairDeploymentHealth {
    return {
      agent: 'dashboard-self-healing',
      deployed: true,
      active: this.active,
      mode: 'runtime',
      score: 100,
      activatedAt: this.activatedAt,
      repairRuns: this.repairRuns,
      widgetStates: [...requiredRepairWidgetStates],
      endpoints: [
        'GET /auto-repair/health',
        'POST /auto-repair/dashboard/snapshot',
      ],
    };
  }

  private activateIfNeeded(): void {
    if (!this.active) {
      this.onModuleInit();
    }
  }
}
