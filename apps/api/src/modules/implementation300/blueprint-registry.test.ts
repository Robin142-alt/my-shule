import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BLUEPRINT_SECTIONS,
  IMPLEMENTATION300_MODULES,
  IMPLEMENTATION300_ROLES,
  INSTITUTION_CATEGORIES,
  KENYAN_INTEGRATIONS,
  SCALE_TARGETS,
} from './blueprint-registry';

describe('Implementation 300 blueprint registry', () => {
  it('covers every blueprint section as a release-tracked requirement', () => {
    assert.equal(BLUEPRINT_SECTIONS.length, 24);
    assert.deepEqual(
      BLUEPRINT_SECTIONS.map((section) => section.id),
      [
        'vision',
        'core-architecture',
        'tenant-management',
        'authentication-identity',
        'school-onboarding',
        'module-blueprint',
        'billing-activation',
        'technical-architecture',
        'multi-tenant-database',
        'integration-layer',
        'ai-analytics',
        'security-compliance',
        'scalability',
        'notifications-automation',
        'mobile-strategy',
        'offline-low-connectivity',
        'audit-monitoring',
        'development-phases',
        'roles',
        'product-positioning',
        'folder-structure',
        'kpis',
        'api-categories',
        'conclusion',
      ],
    );
  });

  it('covers all modules named in the ERP blueprint', () => {
    assert.equal(IMPLEMENTATION300_MODULES.length, 28);
    assert.ok(IMPLEMENTATION300_MODULES.some((module) => module.code === 'iot'));
    assert.ok(IMPLEMENTATION300_MODULES.some((module) => module.code === 'ai_insights'));
    assert.ok(IMPLEMENTATION300_MODULES.every((module) => module.capabilities.length >= 6));
  });

  it('release-tracks the auditable AI governance policy', () => {
    const aiAnalytics = BLUEPRINT_SECTIONS.find((section) => section.id === 'ai-analytics');
    const aiInsights = IMPLEMENTATION300_MODULES.find((module) => module.code === 'ai_insights');

    assert.ok(aiAnalytics?.evidence.some((item) => item.file.endsWith('ai-governance-policy.ts')));
    assert.ok(aiInsights?.evidence.some((item) => item.file.endsWith('ai-governance-policy.ts')));
  });

  it('release-tracks the Kenyan data protection policy', () => {
    const securityCompliance = BLUEPRINT_SECTIONS.find((section) => section.id === 'security-compliance');

    assert.ok(securityCompliance?.evidence.some((item) => item.file.endsWith('data-protection-policy.ts')));
  });

  it('release-tracks the backend automation policy', () => {
    const notificationsAutomation = BLUEPRINT_SECTIONS.find((section) => section.id === 'notifications-automation');

    assert.ok(notificationsAutomation?.evidence.some((item) => item.file.endsWith('automation-policy.ts')));
  });

  it('release-tracks tenant integration and API category policies', () => {
    const integrationLayer = BLUEPRINT_SECTIONS.find((section) => section.id === 'integration-layer');
    const apiCategories = BLUEPRINT_SECTIONS.find((section) => section.id === 'api-categories');

    assert.ok(integrationLayer?.evidence.some((item) => item.file.endsWith('integration-policy.ts')));
    assert.ok(apiCategories?.evidence.some((item) => item.file.endsWith('api-category-policy.ts')));
  });

  it('release-tracks the mobile app access policy', () => {
    const mobileStrategy = BLUEPRINT_SECTIONS.find((section) => section.id === 'mobile-strategy');

    assert.ok(mobileStrategy?.evidence.some((item) => item.file.endsWith('mobile-app-policy.ts')));
  });

  it('release-tracks curriculum and deployment topology policies', () => {
    const academics = IMPLEMENTATION300_MODULES.find((module) => module.code === 'academics');
    const technicalArchitecture = BLUEPRINT_SECTIONS.find((section) => section.id === 'technical-architecture');
    const scalability = BLUEPRINT_SECTIONS.find((section) => section.id === 'scalability');

    assert.ok(academics?.evidence.some((item) => item.file.endsWith('curriculum-policy.ts')));
    assert.ok(technicalArchitecture?.evidence.some((item) => item.file.endsWith('deployment-topology-policy.ts')));
    assert.ok(scalability?.evidence.some((item) => item.file.endsWith('deployment-topology-policy.ts')));
  });

  it('release-tracks the KPI policy', () => {
    const kpis = BLUEPRINT_SECTIONS.find((section) => section.id === 'kpis');

    assert.ok(kpis?.evidence.some((item) => item.file.endsWith('kpi-policy.ts')));
  });

  it('release-tracks the tenant database strategy policy', () => {
    const multiTenantDatabase = BLUEPRINT_SECTIONS.find((section) => section.id === 'multi-tenant-database');

    assert.ok(multiTenantDatabase?.evidence.some((item) => item.file.endsWith('tenant-database-policy.ts')));
  });

  it('release-tracks the audit and monitoring policy', () => {
    const auditMonitoring = BLUEPRINT_SECTIONS.find((section) => section.id === 'audit-monitoring');

    assert.ok(auditMonitoring?.evidence.some((item) => item.file.endsWith('audit-monitoring-policy.ts')));
  });

  it('release-tracks the role governance policy', () => {
    const identity = BLUEPRINT_SECTIONS.find((section) => section.id === 'authentication-identity');
    const roles = BLUEPRINT_SECTIONS.find((section) => section.id === 'roles');

    assert.ok(identity?.evidence.some((item) => item.file.endsWith('role-governance-policy.ts')));
    assert.ok(roles?.evidence.some((item) => item.file.endsWith('role-governance-policy.ts')));
  });

  it('release-tracks the development phase policy', () => {
    const developmentPhases = BLUEPRINT_SECTIONS.find((section) => section.id === 'development-phases');

    assert.ok(developmentPhases?.evidence.some((item) => item.file.endsWith('development-phase-policy.ts')));
  });

  it('covers institution categories, roles, Kenyan integrations, and scale targets', () => {
    assert.deepEqual(INSTITUTION_CATEGORIES, [
      'international_school',
      'primary_school',
      'junior_school',
      'secondary_high_school',
    ]);
    assert.ok(IMPLEMENTATION300_ROLES.includes('principal'));
    assert.ok(IMPLEMENTATION300_ROLES.includes('security_officer'));
    assert.ok(KENYAN_INTEGRATIONS.includes('mpesa'));
    assert.equal(SCALE_TARGETS.minimumSchools, 1000);
    assert.equal(SCALE_TARGETS.concurrencyProfile, 'tens_of_thousands_of_concurrent_features');
  });
});
