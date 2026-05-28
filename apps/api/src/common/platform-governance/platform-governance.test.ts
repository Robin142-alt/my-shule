import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluatePlatformDesign,
  platformGovernanceLayers,
  requiredFeatureDesignSections,
} from './platform-governance';

test('PlatformGovernance requires every independent MyShule platform layer', () => {
  assert.deepEqual(platformGovernanceLayers, [
    'Tenant Lifecycle Layer',
    'Billing Layer',
    'Module Entitlement Layer',
    'Capability Engine Layer',
    'Workflow Engine Layer',
    'Policy & Rules Engine',
    'Event Bus Layer',
    'Widget Registry Layer',
    'Identity & Authentication Layer',
    'Notification Layer',
    'Reporting & Analytics Layer',
    'Integration Layer',
    'Audit & Compliance Layer',
    'File Management Layer',
    'AI Intelligence Layer',
    'Real-Time Sync Layer',
    'Infrastructure & Monitoring Layer',
  ]);
});

test('PlatformGovernance accepts compliant feature designs with full output expectations', () => {
  const result = evaluatePlatformDesign({
    featureName: 'Report Card Publishing',
    layersUsed: platformGovernanceLayers,
    architecture: true,
    workflows: true,
    events: true,
    permissions: true,
    widgetBehavior: true,
    failureHandling: true,
    auditBehavior: true,
    apis: true,
    dbStructure: true,
    scalability: true,
    security: true,
    tenantIsolation: true,
    modulesOnlyProvideData: true,
    dashboardsStatic: true,
    capabilityEngineEnforced: true,
    widgetStates: ['ACTIVE', 'EMPTY', 'LOCKED', 'DEGRADED', 'FAILED', 'LOADING'],
    directModuleCoupling: false,
    hiddenFailures: false,
    hardcodedApprovalChain: false,
  });

  assert.deepEqual(requiredFeatureDesignSections, [
    'architecture',
    'workflows',
    'events',
    'permissions',
    'widgetBehavior',
    'failureHandling',
    'auditBehavior',
    'apis',
    'dbStructure',
    'scalability',
    'security',
    'tenantIsolation',
  ]);
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.violations, []);
});

test('PlatformGovernance rejects drift: module UI control, dynamic dashboards, hidden failures, and hardcoded workflows', () => {
  const result = evaluatePlatformDesign({
    featureName: 'Exam Publishing Shortcut',
    layersUsed: [
      'Tenant Lifecycle Layer',
      'Capability Engine Layer',
      'Event Bus Layer',
      'Widget Registry Layer',
    ],
    architecture: true,
    workflows: false,
    events: true,
    permissions: true,
    widgetBehavior: false,
    failureHandling: false,
    auditBehavior: false,
    apis: true,
    dbStructure: false,
    scalability: false,
    security: false,
    tenantIsolation: false,
    modulesOnlyProvideData: false,
    dashboardsStatic: false,
    capabilityEngineEnforced: false,
    widgetStates: ['ACTIVE', 'EMPTY', 'LOCKED', 'DEGRADED', 'FAILED'],
    directModuleCoupling: true,
    hiddenFailures: true,
    hardcodedApprovalChain: true,
  });

  assert.equal(result.status, 'fail');
  assert.deepEqual(
    result.violations.map((violation) => violation.rule),
    [
      'Missing platform layers',
      'Incomplete feature design output',
      'Modules are data providers only',
      'Dashboards are static role-based workspaces',
      'Capability engine controls everything',
      'Widget-based UI only',
      'Self-healing system design',
      'Workflow engine required',
    ],
  );
});
