export const platformGovernanceLayers = [
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
] as const;

export const requiredFeatureDesignSections = [
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
] as const;

export const platformWidgetStates = ['ACTIVE', 'EMPTY', 'LOCKED', 'DEGRADED', 'FAILED', 'LOADING'] as const;
export const platformButtonStates = ['ACTIVE', 'DEGRADED', 'FAILED', 'LOCKED'] as const;

export type PlatformGovernanceLayer = typeof platformGovernanceLayers[number];
export type RequiredFeatureDesignSection = typeof requiredFeatureDesignSections[number];
export type PlatformWidgetState = typeof platformWidgetStates[number];

export interface PlatformFeatureDesign {
  featureName: string;
  layersUsed: readonly string[];
  architecture: boolean;
  workflows: boolean;
  events: boolean;
  permissions: boolean;
  widgetBehavior: boolean;
  failureHandling: boolean;
  auditBehavior: boolean;
  apis: boolean;
  dbStructure: boolean;
  scalability: boolean;
  security: boolean;
  tenantIsolation: boolean;
  modulesOnlyProvideData: boolean;
  dashboardsStatic: boolean;
  capabilityEngineEnforced: boolean;
  widgetStates: readonly string[];
  directModuleCoupling: boolean;
  hiddenFailures: boolean;
  hardcodedApprovalChain: boolean;
}

export interface PlatformGovernanceViolation {
  rule: string;
  affectedComponents: string[];
  enforcement: string;
}

export interface PlatformGovernanceResult {
  featureName: string;
  status: 'pass' | 'fail';
  violations: PlatformGovernanceViolation[];
}

export function evaluatePlatformDesign(design: PlatformFeatureDesign): PlatformGovernanceResult {
  const violations: PlatformGovernanceViolation[] = [];
  const missingLayers = platformGovernanceLayers.filter((layer) => !design.layersUsed.includes(layer));
  const missingSections = requiredFeatureDesignSections.filter((section) => design[section] !== true);
  const missingWidgetStates = platformWidgetStates.filter((state) => !design.widgetStates.includes(state));

  if (missingLayers.length > 0) {
    violations.push({
      rule: 'Missing platform layers',
      affectedComponents: missingLayers,
      enforcement: 'Declare and preserve independent platform layers before implementation',
    });
  }

  if (missingSections.length > 0) {
    violations.push({
      rule: 'Incomplete feature design output',
      affectedComponents: missingSections,
      enforcement: 'Define architecture, workflow, event, permission, widget, failure, audit, API, DB, scale, security, and tenant-isolation behavior',
    });
  }

  if (!design.modulesOnlyProvideData || design.directModuleCoupling) {
    violations.push({
      rule: 'Modules are data providers only',
      affectedComponents: ['modules', 'ui'],
      enforcement: 'Remove direct UI/module control and route through APIs, events, capabilities, and widgets',
    });
  }

  if (!design.dashboardsStatic) {
    violations.push({
      rule: 'Dashboards are static role-based workspaces',
      affectedComponents: ['dashboard-layout'],
      enforcement: 'Restore static role workspace and render widgets by state instead of mutating layout',
    });
  }

  if (!design.capabilityEngineEnforced) {
    violations.push({
      rule: 'Capability engine controls everything',
      affectedComponents: ['permissions', 'actions', 'widgets'],
      enforcement: 'Route all visibility and execution checks through capability engine',
    });
  }

  if (!design.widgetBehavior || missingWidgetStates.length > 0) {
    violations.push({
      rule: 'Widget-based UI only',
      affectedComponents: missingWidgetStates.length > 0 ? missingWidgetStates : ['widgetBehavior'],
      enforcement: 'Keep widgets visible and support ACTIVE, EMPTY, LOCKED, DEGRADED, FAILED, and LOADING',
    });
  }

  if (!design.failureHandling || design.hiddenFailures) {
    violations.push({
      rule: 'Self-healing system design',
      affectedComponents: ['failureHandling'],
      enforcement: 'Expose failure safely with retry, fallback, recovery workflow, or auto-repair',
    });
  }

  if (!design.workflows || design.hardcodedApprovalChain) {
    violations.push({
      rule: 'Workflow engine required',
      affectedComponents: ['workflows'],
      enforcement: 'Move approvals and state machines into workflow engine templates with audit tracking',
    });
  }

  return {
    featureName: design.featureName,
    status: violations.length === 0 ? 'pass' : 'fail',
    violations,
  };
}
