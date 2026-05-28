import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { CommonModule } from '../common.module';
import { AutoRepairController } from './auto-repair.controller';
import { AutoRepairService } from './auto-repair.service';
import { requiredRepairWidgetStates } from './auto-repair-agent';

test('CommonModule deploys the dashboard auto-repair agent as a runtime service', () => {
  const controllers =
    (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, CommonModule) as Array<{ name?: string }> | undefined) ?? [];
  const providers =
    (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CommonModule) as Array<{ name?: string }> | undefined) ?? [];
  const exports =
    (Reflect.getMetadata(MODULE_METADATA.EXPORTS, CommonModule) as Array<{ name?: string }> | undefined) ?? [];

  assert.equal(controllers.some((controller) => controller?.name === 'AutoRepairController'), true);
  assert.equal(providers.some((provider) => provider?.name === 'AutoRepairService'), true);
  assert.equal(exports.some((provider) => provider?.name === 'AutoRepairService'), true);
});

test('AutoRepairController exposes a protected dashboard repair endpoint', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, AutoRepairController), 'auto-repair');

  const repairDescriptor = Object.getOwnPropertyDescriptor(
    AutoRepairController.prototype,
    'repairDashboardSnapshot',
  );
  const healthDescriptor = Object.getOwnPropertyDescriptor(
    AutoRepairController.prototype,
    'getDeploymentHealth',
  );

  assert.ok(repairDescriptor?.value);
  assert.ok(healthDescriptor?.value);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, repairDescriptor.value), ['platform:auto-repair']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, healthDescriptor.value), ['platform:auto-repair']);
});

test('AutoRepairService reports deployed runtime readiness and keeps the full widget state contract', () => {
  const service = new AutoRepairService();
  service.onModuleInit();
  const health = service.getDeploymentHealth();

  assert.equal(health.deployed, true);
  assert.equal(health.active, true);
  assert.equal(health.mode, 'runtime');
  assert.equal(health.score, 100);
  assert.equal(typeof health.activatedAt, 'string');
  assert.deepEqual(health.widgetStates, [...requiredRepairWidgetStates]);
});

test('AutoRepairService actively repairs snapshots after startup and records runtime runs', () => {
  const service = new AutoRepairService();
  service.onModuleInit();

  const report = service.repairDashboardSnapshot({
    tenant: {
      tenantId: 'tenant-active',
      lifecycleState: 'ACTIVE',
    },
    moduleAssignments: {
      finance: 'ENABLED',
    },
    capabilityMap: {
      'finance:read': true,
    },
    widgetRegistry: {
      version: '2026.05',
      widgets: [],
    },
    uiDashboardState: {
      dashboardId: 'principal',
      role: 'principal',
      staticLayout: false,
      widgets: [
        {
          widgetId: 'finance.summary',
          state: 'ACTIVE',
          visible: false,
          moduleSource: 'finance',
          capabilitiesRequired: ['finance:read'],
          eventSubscriptions: ['fee.paid'],
        },
      ],
    },
    eventBindings: {},
    eventLogs: [
      {
        eventName: 'fee.paid',
        tenantId: 'tenant-active',
        emittedAt: '2026-05-26T00:00:00.000Z',
      },
    ],
    failedActionsLog: [],
  });
  const health = service.getDeploymentHealth();

  assert.equal(report.systemStateAfterFix.uiDashboardState.staticLayout, true);
  assert.equal(health.active, true);
  assert.equal(health.repairRuns, 1);
});
