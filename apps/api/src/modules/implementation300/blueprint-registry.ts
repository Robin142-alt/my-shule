export type BlueprintSectionId =
  | 'vision'
  | 'core-architecture'
  | 'tenant-management'
  | 'authentication-identity'
  | 'school-onboarding'
  | 'module-blueprint'
  | 'billing-activation'
  | 'technical-architecture'
  | 'multi-tenant-database'
  | 'integration-layer'
  | 'ai-analytics'
  | 'security-compliance'
  | 'scalability'
  | 'notifications-automation'
  | 'mobile-strategy'
  | 'offline-low-connectivity'
  | 'audit-monitoring'
  | 'development-phases'
  | 'roles'
  | 'product-positioning'
  | 'folder-structure'
  | 'kpis'
  | 'api-categories'
  | 'conclusion';

export type Implementation300ModuleCode =
  | 'students'
  | 'admissions'
  | 'academics'
  | 'finance'
  | 'exams'
  | 'discipline'
  | 'timetable'
  | 'lab_management'
  | 'teacher_biometric_attendance'
  | 'parent_portal'
  | 'inventory'
  | 'library'
  | 'transport'
  | 'communication_sms'
  | 'reports'
  | 'staff'
  | 'admin_command_centers'
  | 'principal_dashboard'
  | 'clinic_health'
  | 'procurement'
  | 'hostel'
  | 'boarding'
  | 'cbt_exams'
  | 'lms'
  | 'ai_insights'
  | 'visitor_management'
  | 'asset_tracking'
  | 'iot';

export type BlueprintEvidence = {
  id: string;
  label: string;
  file: string;
  tokens: readonly string[];
};

export type BlueprintSection = {
  id: BlueprintSectionId;
  title: string;
  evidence: readonly BlueprintEvidence[];
};

export type Implementation300Module = {
  code: Implementation300ModuleCode;
  name: string;
  capabilities: readonly string[];
  evidence: readonly BlueprintEvidence[];
};

export const INSTITUTION_CATEGORIES = [
  'international_school',
  'primary_school',
  'junior_school',
  'secondary_high_school',
] as const;

export const IMPLEMENTATION300_ROLES = [
  'super_admin',
  'platform_support',
  'finance_admin',
  'school_admin',
  'principal',
  'deputy_principal',
  'secretary',
  'bursar',
  'accountant',
  'hod',
  'teacher',
  'class_teacher',
  'parent',
  'student',
  'librarian',
  'nurse',
  'storekeeper',
  'driver',
  'boarding_master',
  'security_officer',
  'hr_officer',
  'procurement_officer',
  'transport_manager',
  'lab_technician',
] as const;

export const KENYAN_INTEGRATIONS = [
  'mpesa',
  'bank_apis',
  'sms_gateways',
  'knec_hooks',
  'nemis_hooks',
] as const;

export const SCALE_TARGETS = {
  minimumSchools: 1000,
  concurrencyProfile: 'tens_of_thousands_of_concurrent_features',
  storageProfile: 'millions_of_records',
  scalingMethods: [
    'horizontal_scaling',
    'read_replicas',
    'queue_workers',
    'cdn_usage',
    'caching',
    'sharding_readiness',
    'autoscaling',
  ],
} as const;

const evidence = (
  id: string,
  label: string,
  file: string,
  tokens: readonly string[],
): BlueprintEvidence => ({
  id,
  label,
  file,
  tokens,
});

const section = (
  id: BlueprintSectionId,
  title: string,
  evidenceItems: readonly BlueprintEvidence[],
): BlueprintSection => ({
  id,
  title,
  evidence: evidenceItems,
});

const moduleDefinition = (
  code: Implementation300ModuleCode,
  name: string,
  capabilities: readonly string[],
  evidenceItems: readonly BlueprintEvidence[],
): Implementation300Module => ({
  code,
  name,
  capabilities,
  evidence: evidenceItems,
});

const moduleAccessEvidence = evidence(
  'implementation300-module-access-catalog',
  'Module access catalog contains tenant-activatable school modules',
  'apps/api/src/modules/module-access/module-access.constants.ts',
  ['MODULE_REGISTRY_SEED', 'students', 'iot'],
);

const onboardingEvidence = evidence(
  'implementation300-platform-onboarding',
  'Platform onboarding creates tenant schools and assigns modules',
  'apps/api/src/modules/platform/platform-onboarding.service.ts',
  ['createSchool', 'assignInitialModules'],
);

export const BLUEPRINT_SECTIONS: BlueprintSection[] = [
  section('vision', 'Vision and institution categories', [
    evidence('implementation300-institution-categories', 'Institution categories are tracked', 'apps/api/src/modules/implementation300/blueprint-registry.ts', [
      'international_school',
      'primary_school',
      'junior_school',
      'secondary_high_school',
    ]),
  ]),
  section('core-architecture', 'Core multi-tenant architecture', [
    moduleAccessEvidence,
    evidence('implementation300-tenant-isolation-audit', 'Tenant isolation audit exists', 'apps/api/src/scripts/tenant-isolation-audit.ts', [
      'tenant_id',
      'TenantIsolationAudit',
    ]),
  ]),
  section('tenant-management', 'Tenant management engine', [onboardingEvidence]),
  section('authentication-identity', 'Authentication and identity', [
    evidence('implementation300-auth-service', 'Authentication service is tenant-aware', 'apps/api/src/auth/auth.service.ts', [
      'AuthService',
      'tenant',
    ]),
    evidence('implementation300-identity-blueprint', 'Identity blueprint covers all login methods, security controls, and roles', 'apps/api/src/auth/identity-blueprint.ts', [
      'BLUEPRINT_AUTHENTICATION_METHODS',
      'BLUEPRINT_IDENTITY_SECURITY_CONTROLS',
      'BLUEPRINT_USER_ROLES',
    ]),
    evidence('implementation300-role-governance-policy', 'Role governance policy enforces global roles, school roles, tenant boundaries, MFA, module-bound roles, and permission inheritance', 'apps/api/src/auth/role-governance-policy.ts', [
      'ROLE_GOVERNANCE_BLUEPRINT',
      'buildRoleGovernancePolicy',
      'evaluateRoleAssignment',
    ]),
    evidence('implementation300-mfa-service', 'MFA service exists', 'apps/api/src/auth/mfa.service.ts', ['MfaService']),
    evidence('implementation300-trusted-device-service', 'Trusted device sessions exist', 'apps/api/src/auth/trusted-device.service.ts', [
      'TrustedDeviceService',
    ]),
  ]),
  section('school-onboarding', 'School onboarding workflow', [onboardingEvidence]),
  section('module-blueprint', 'Module blueprint coverage', [
    evidence('implementation300-implementation100-modules', 'Implementation 100 covers module evidence', 'apps/api/src/scripts/implementation100-certification.ts', [
      'IMPLEMENTATION100_MODULES',
      'moduleEvidence',
    ]),
  ]),
  section('billing-activation', 'Billing and module activation model', [
    moduleAccessEvidence,
    evidence('implementation300-billing-service', 'Billing service manages tenant invoices and subscriptions', 'apps/api/src/modules/billing/billing.service.ts', [
      'BillingService',
      'Invoice',
    ]),
    evidence('implementation300-billing-contracts', 'Billing contracts support negotiated pricing and quota usage', 'apps/api/src/modules/billing/billing-contract.ts', [
      'calculateTenantBillingContractInvoice',
      'negotiatedAmountMinor',
      'overageRates',
    ]),
  ]),
  section('technical-architecture', 'Technical architecture', [
    evidence('implementation300-api-module', 'Nest API module is present', 'apps/api/src/app.module.ts', ['AppModule']),
    evidence('implementation300-deployment-topology', 'Deployment topology policy covers cloud, hybrid, and dedicated enterprise modes', 'apps/api/src/infrastructure/deployment-topology-policy.ts', [
      'DEPLOYMENT_OPTIONS',
      'buildDeploymentTopologyPolicy',
      'evaluateDeploymentReadiness',
    ]),
    evidence('implementation300-web-package', 'Next.js web app is present', 'apps/web/package.json', ['next', 'react']),
  ]),
  section('multi-tenant-database', 'Multi-tenant database strategy', [
    evidence('implementation300-tenant-database-policy', 'Tenant database policy validates tenant identifiers, forced RLS, module activation tables, and tenant-level encryption', 'apps/api/src/database/tenant-database-policy.ts', [
      'TENANT_DATABASE_BLUEPRINT',
      'buildTenantDatabasePolicy',
      'evaluateTenantSchemaSnapshot',
    ]),
    evidence('implementation300-database-schema', 'Database schema includes tenant identifiers', 'apps/api/src/database/schema.sql', ['tenant_id']),
    evidence('implementation300-tenant-bound-guard', 'Tenant-bound guard exists', 'apps/api/src/guards/tenant-bound.guard.ts', [
      'tenant',
    ]),
  ]),
  section('integration-layer', 'Integration layer', [
    evidence('implementation300-integration-policy', 'Integration policy covers Kenyan and external tenant provider activation', 'apps/api/src/modules/integrations/integration-policy.ts', [
      'BLUEPRINT_INTEGRATION_PROVIDERS',
      'buildTenantIntegrationPolicy',
      'evaluateIntegrationConfig',
    ]),
    evidence('implementation300-provider-smoke', 'Provider smoke covers external integrations', 'apps/api/src/scripts/provider-credential-smoke.ts', [
      'ProviderCredentialSmoke',
    ]),
    evidence('implementation300-school-sms', 'School SMS integration exists', 'apps/api/src/modules/integrations/school-sms.controller.ts', [
      'SchoolSmsController',
    ]),
  ]),
  section('ai-analytics', 'AI and analytics layer', [
    evidence('implementation300-ai-insights-service', 'AI insights service exists', 'apps/api/src/modules/ai-insights/ai-insights.service.ts', [
      'AiInsightsService',
    ]),
    evidence('implementation300-ai-governance-policy', 'AI governance policy enforces tenant-scoped auditable recommendations', 'apps/api/src/modules/ai-insights/ai-governance-policy.ts', [
      'AI_INSIGHT_CAPABILITIES',
      'createAuditableAiInsight',
      'human_review_required',
    ]),
    evidence('implementation300-scorecard', 'Production scorecard exists', 'apps/api/src/scripts/generate-production-scorecard.ts', [
      'generateProductionScorecard',
    ]),
  ]),
  section('security-compliance', 'Security and compliance', [
    evidence('implementation300-security-scan', 'Security scan exists', 'apps/api/src/scripts/security-scan.ts', ['runSecurityScan']),
    evidence('implementation300-pii-scan', 'PII leak scan exists', 'apps/api/src/scripts/pii-leak-ci-scan.ts', ['runPiiLeakCiScan']),
    evidence('implementation300-data-protection-policy', 'Data protection policy covers Kenyan consent, retention, encryption, and DPIA controls', 'apps/api/src/modules/compliance/data-protection-policy.ts', [
      'Kenyan Data Protection Act',
      'KENYAN_DATA_PROTECTION_CONTROLS',
      'child_data_dpia',
    ]),
    evidence('implementation300-compliance', 'Compliance module tests exist', 'apps/api/src/modules/compliance/compliance.test.ts', [
      'compliance',
    ]),
  ]),
  section('scalability', 'Scalability strategy', [
    evidence('implementation300-deployment-scale-readiness', 'Deployment topology validates scale controls for 1000+ schools', 'apps/api/src/infrastructure/deployment-topology-policy.ts', [
      'read_replicas',
      'queue_workers',
      'autoscaling',
    ]),
    evidence('implementation300-load-profile', 'Implementation 90 load profile exists', 'apps/api/src/scripts/implementation90-load-profile.ts', [
      'Implementation90',
    ]),
    evidence('implementation300-high-volume-workflows', 'High volume workflow load exists', 'apps/api/src/scripts/high-volume-workflow-load.ts', [
      'workflow',
    ]),
  ]),
  section('notifications-automation', 'Notifications and automation', [
    evidence('implementation300-events-service', 'Student events publisher exists', 'apps/api/src/modules/events/student-events.service.ts', [
      'StudentEventsService',
    ]),
    evidence('implementation300-automation-policy', 'Automation policy covers fee reminders, low stock, attendance, discipline, timetable, exams, and clinic triggers', 'apps/api/src/modules/automation/automation-policy.ts', [
      'BLUEPRINT_AUTOMATION_TRIGGERS',
      'evaluateAutomationEvents',
      'discipline_escalation',
    ]),
    evidence('implementation300-workflow-catalog', 'Approval workflow catalog exists', 'apps/web/src/lib/workflows/workflow-catalog.ts', [
      'getVisibleApprovalWorkflows',
    ]),
  ]),
  section('mobile-strategy', 'Mobile strategy', [
    evidence('implementation300-mobile-app-policy', 'Mobile app policy covers parent, teacher, student, and admin app access', 'apps/api/src/modules/mobile/mobile-app-policy.ts', [
      'BLUEPRINT_MOBILE_APPS',
      'buildMobileAccessPolicy',
      'evaluateMobileSession',
    ]),
    evidence('implementation300-web-manifest', 'Mobile PWA manifest exists', 'apps/web/src/app/manifest.ts', ['display']),
    evidence('implementation300-parent-portal', 'Parent portal surface exists', 'apps/web/src/app/parent-portal/page.tsx', ['Parent']),
  ]),
  section('offline-low-connectivity', 'Offline and low connectivity support', [
    evidence('implementation300-sync-service', 'Sync service exists', 'apps/api/src/modules/sync/sync.service.ts', ['SyncService']),
    evidence('implementation300-offline-workflow-policy', 'Offline policy covers attendance, marks, conflicts, cache, and SMS fallback', 'apps/api/src/modules/sync/offline-workflow-policy.ts', [
      'student_attendance',
      'mark_entry',
      'sms_fallback',
      'server_review_required',
    ]),
    evidence('implementation300-offline-page', 'Offline state page exists', 'apps/web/src/app/offline/page.tsx', ['offline']),
  ]),
  section('audit-monitoring', 'Audit and monitoring', [
    evidence('implementation300-audit-monitoring-policy', 'Audit monitoring policy covers user activity, login history, record changes, approvals, financial trails, device logs, uptime, errors, resources, tenant monitoring, and usage analytics', 'apps/api/src/modules/observability/audit-monitoring-policy.ts', [
      'AUDIT_MONITORING_BLUEPRINT',
      'buildAuditMonitoringPolicy',
      'evaluateAuditMonitoringSnapshot',
    ]),
    evidence('implementation300-audit-coverage', 'Audit coverage review exists', 'apps/api/src/scripts/audit-coverage-review.ts', [
      'runAuditCoverageReview',
    ]),
    evidence('implementation300-observability', 'Observability tests exist', 'apps/api/src/modules/observability/observability.test.ts', [
      'observability',
    ]),
  ]),
  section('development-phases', 'Recommended development phases', [
    evidence('implementation300-development-phase-policy', 'Development phase policy enforces Phase 1 core ERP, Phase 2 operations, Phase 3 advanced, and Phase 4 enterprise intelligence rollout order', 'apps/api/src/modules/implementation300/development-phase-policy.ts', [
      'DEVELOPMENT_PHASE_BLUEPRINT',
      'buildDevelopmentPhasePlan',
      'evaluateDevelopmentPhaseProgress',
    ]),
    evidence('implementation300-release-readiness', 'Release readiness gate exists', 'apps/api/src/scripts/release-readiness-gate.ts', [
      'runReleaseReadinessGate',
    ]),
  ]),
  section('roles', 'Recommended user roles', [
    evidence('implementation300-role-governance-policy', 'Role governance policy covers global and school ERP role assignment rules', 'apps/api/src/auth/role-governance-policy.ts', [
      'ROLE_GOVERNANCE_BLUEPRINT',
      'globalRoles',
      'schoolRoles',
    ]),
    evidence('implementation300-role-registry', 'Blueprint roles are tracked', 'apps/api/src/modules/implementation300/blueprint-registry.ts', [
      'principal',
      'security_officer',
    ]),
  ]),
  section('product-positioning', 'Final product positioning', [
    evidence('implementation300-public-home', 'Public MyShule web surface exists', 'apps/web/src/app/page.tsx', ['MyShule']),
    evidence('implementation300-seo-metadata', 'SEO metadata names MyShule', 'apps/web/src/lib/seo/metadata.ts', ['MyShule']),
  ]),
  section('folder-structure', 'High-level folder structure', [
    evidence('implementation300-app-module', 'API app module composes service folders', 'apps/api/src/app.module.ts', ['imports']),
    evidence('implementation300-web-layout', 'Web app layout exists', 'apps/web/src/app/layout.tsx', ['children']),
  ]),
  section('kpis', 'Recommended KPIs', [
    evidence('implementation300-kpi-policy', 'KPI policy covers financial, academic, operational, and executive metrics', 'apps/api/src/modules/analytics/kpi-policy.ts', [
      'BLUEPRINT_KPI_CATEGORIES',
      'buildKpiPolicy',
      'evaluateKpiSnapshot',
    ]),
    evidence('implementation300-dashboard-summary', 'Dashboard summary repository exists', 'apps/api/src/common/dashboard/dashboard-summary.repository.ts', [
      'DashboardSummary',
    ]),
    evidence('implementation300-principal-dashboard', 'Principal command API exists', 'apps/api/src/modules/admin-command/admin-command.controller.ts', [
      'principal',
    ]),
  ]),
  section('api-categories', 'Recommended API categories', [
    evidence('implementation300-api-category-policy', 'API category policy covers public, internal, and third-party APIs', 'apps/api/src/modules/implementation300/api-category-policy.ts', [
      'API_CATEGORY_REGISTRY',
      'buildApiCategoryPolicy',
      'classifyApiRoute',
    ]),
    evidence('implementation300-route-permissions', 'Route permission tests exist', 'apps/api/src/app-route-permissions.test.ts', [
      'access metadata',
    ]),
  ]),
  section('conclusion', 'Conclusion and operating principles', [
    evidence('implementation300-certification', 'Implementation 300 certification script exists', 'apps/api/src/scripts/implementation300-certification.ts', [
      'Implementation 300 Blueprint Compliance Certification',
    ]),
  ]),
];

export const IMPLEMENTATION300_MODULES: Implementation300Module[] = [
  moduleDefinition('students', 'Student Management', ['biodata', 'guardians', 'documents', 'lifecycle', 'analytics', 'nemis-hooks'], [
    evidence('students-controller', 'Student controller exists', 'apps/api/src/modules/students/students.controller.ts', ['StudentsController']),
    evidence('students-test', 'Student workflow tests exist', 'apps/api/src/modules/students/students.test.ts', ['students']),
  ]),
  moduleDefinition('admissions', 'Admissions', ['applications', 'workflow', 'interviews', 'exams', 'approvals', 'letters'], [
    evidence('admissions-controller', 'Admissions controller exists', 'apps/api/src/modules/admissions/admissions.controller.ts', ['AdmissionsController']),
    evidence('admissions-ui', 'Admissions workspace exists', 'apps/web/src/components/modules/admissions/admissions-module-screen.tsx', [
      'AdmissionsModuleScreen',
    ]),
  ]),
  moduleDefinition('academics', 'Academic Structure', ['cbc', 'cbe', '8-4-4', 'cambridge', 'classes', 'subjects'], [
    evidence('academics-controller', 'Academics controller exists', 'apps/api/src/modules/academics/academics.controller.ts', ['AcademicsController']),
    evidence('academics-curriculum-policy', 'Academic curriculum policy covers CBC, CBE, 8-4-4, Cambridge, IGCSE, and international structures', 'apps/api/src/modules/academics/curriculum-policy.ts', [
      'BLUEPRINT_CURRICULA',
      'buildCurriculumPolicy',
      'evaluateCurriculumSetup',
    ]),
    evidence('academics-test', 'Academics tests exist', 'apps/api/src/modules/academics/academics.test.ts', ['academics']),
  ]),
  moduleDefinition('finance', 'Fee Management', ['billing', 'mpesa', 'bank-imports', 'invoices', 'receipts', 'arrears'], [
    evidence('billing-controller', 'Billing controller exists', 'apps/api/src/modules/billing/billing.controller.ts', ['BillingController']),
    evidence('payments-controller', 'Payments controller exists', 'apps/api/src/modules/payments/controllers/payments.controller.ts', ['PaymentsController']),
  ]),
  moduleDefinition('exams', 'Exams and Results', ['setup', 'grading', 'cbc-assessment', 'moderation', 'reports', 'analytics'], [
    evidence('exams-controller', 'Exams controller exists', 'apps/api/src/modules/exams/exams.controller.ts', ['ExamsController']),
    evidence('exams-ui', 'Exams workspace exists', 'apps/web/src/components/modules/exams/exams-module-screen.tsx', ['Exams']),
  ]),
  moduleDefinition('discipline', 'Discipline', ['incidents', 'actions', 'counselling', 'notices', 'scoring', 'escalation'], [
    evidence('discipline-controller', 'Discipline controller exists', 'apps/api/src/modules/discipline/discipline.controller.ts', [
      'DisciplineController',
    ]),
    evidence('discipline-ui', 'Discipline workspace exists', 'apps/web/src/components/discipline/discipline-workspace.tsx', [
      'Discipline',
    ]),
  ]),
  moduleDefinition('timetable', 'Timetable', ['generation', 'conflicts', 'rooms', 'labs', 'workload', 'substitutions'], [
    evidence('timetable-controller', 'Timetable controller exists', 'apps/api/src/modules/timetable/timetable.controller.ts', ['TimetableController']),
    evidence('timetable-test', 'Timetable tests exist', 'apps/api/src/modules/timetable/timetable.test.ts', ['timetable']),
  ]),
  moduleDefinition('lab_management', 'Laboratory Management', ['inventory', 'chemicals', 'compliance', 'equipment', 'sessions', 'hazards'], [
    evidence('labs-controller', 'Labs controller exists', 'apps/api/src/modules/labs/labs.controller.ts', ['LabsController']),
    evidence('labs-test', 'Labs tests exist', 'apps/api/src/modules/labs/labs.test.ts', ['labs']),
  ]),
  moduleDefinition('teacher_biometric_attendance', 'Teacher Attendance', ['biometrics', 'gps', 'rfid', 'analytics', 'leave', 'offline-sync'], [
    evidence('attendance-controller', 'Biometric attendance controller exists', 'apps/api/src/modules/biometric-attendance/biometric-attendance.controller.ts', [
      'BiometricAttendanceController',
    ]),
    evidence('attendance-test', 'Biometric attendance tests exist', 'apps/api/src/modules/biometric-attendance/biometric-attendance.test.ts', [
      'attendance',
    ]),
  ]),
  moduleDefinition('parent_portal', 'Parent Portal', ['fees', 'results', 'timetable', 'assignments', 'messages', 'health'], [
    evidence('parent-page', 'Parent portal page exists', 'apps/web/src/app/parent-portal/page.tsx', ['Parent']),
    evidence('parent-auth-controller', 'Parent portal auth controller exists', 'apps/api/src/modules/integrations/parent-portal-auth.controller.ts', [
      'ParentPortalAuthController',
    ]),
  ]),
  moduleDefinition('inventory', 'Store and Inventory', ['stock', 'procurement', 'barcode', 'transfers', 'valuation', 'reorder-alerts'], [
    evidence('inventory-controller', 'Inventory controller exists', 'apps/api/src/modules/inventory/inventory.controller.ts', ['InventoryController']),
    evidence('inventory-ui', 'Inventory workspace exists', 'apps/web/src/components/storekeeper/storekeeper-workspace.tsx', ['Inventory']),
  ]),
  moduleDefinition('library', 'Library', ['catalog', 'barcode-rfid', 'lending', 'fines', 'ebooks', 'audits'], [
    evidence('library-controller', 'Library controller exists', 'apps/api/src/modules/library/library.controller.ts', ['LibraryController']),
    evidence('library-ui', 'Library workspace exists', 'apps/web/src/components/library/library-workspace.tsx', ['Library']),
  ]),
  moduleDefinition('transport', 'Transport', ['routes', 'vehicles', 'drivers', 'manifests', 'alerts', 'gps'], [
    evidence('transport-controller', 'Transport controller exists', 'apps/api/src/modules/transport/transport.controller.ts', ['TransportController']),
    evidence('transport-ui', 'Transport workspace exists', 'apps/web/src/components/modules/transport/transport-module-screen.tsx', ['Transport']),
  ]),
  moduleDefinition('communication_sms', 'Communication and SMS', ['bulk-sms', 'email', 'whatsapp', 'reminders', 'delivery', 'scheduled-messages'], [
    evidence('sms-controller', 'School SMS controller exists', 'apps/api/src/modules/integrations/school-sms.controller.ts', ['SchoolSmsController']),
    evidence('sms-wallet', 'School SMS wallet service exists', 'apps/api/src/modules/integrations/school-sms-wallet.service.ts', [
      'SchoolSmsWalletService',
    ]),
  ]),
  moduleDefinition('reports', 'Reports', ['pdf', 'excel', 'csv', 'scheduled', 'dashboards', 'printing'], [
    evidence('report-controller', 'Report export controller exists', 'apps/api/src/common/reports/report-export-jobs.controller.ts', [
      'ReportExportJobsController',
    ]),
    evidence('report-worker', 'Report export worker exists', 'apps/api/src/common/reports/report-export.worker.ts', ['ReportExportWorker']),
  ]),
  moduleDefinition('staff', 'Staff and HR', ['profiles', 'contracts', 'leave', 'payroll', 'duties', 'appraisals'], [
    evidence('hr-controller', 'HR controller exists', 'apps/api/src/modules/hr/hr.controller.ts', ['HrController']),
    evidence('hr-test', 'HR tests exist', 'apps/api/src/modules/hr/hr.test.ts', ['staff']),
  ]),
  moduleDefinition('admin_command_centers', 'Administrative Leadership', ['principal', 'deputy', 'secretary', 'front-office', 'approvals', 'alerts'], [
    evidence('admin-command-controller', 'Admin command controller exists', 'apps/api/src/modules/admin-command/admin-command.controller.ts', [
      'AdminCommandController',
    ]),
    evidence('school-pages', 'School pages contain leadership areas', 'apps/web/src/components/school/school-pages.tsx', ['Leadership']),
  ]),
  moduleDefinition('principal_dashboard', 'Principal Executive Dashboard', ['kpis', 'enrollment', 'revenue', 'academics', 'discipline', 'ai'], [
    evidence('principal-controller', 'Principal command API exists', 'apps/api/src/modules/admin-command/admin-command.controller.ts', [
      'principal',
    ]),
    evidence('principal-ui', 'Principal command center exists', 'apps/web/src/components/school/principal-command-center.tsx', ['Principal']),
  ]),
  moduleDefinition('clinic_health', 'Clinic and Health', ['visits', 'profiles', 'medicine', 'dispensing', 'allergies', 'referrals'], [
    evidence('clinic-controller', 'Clinic controller exists', 'apps/api/src/modules/clinic/clinic.controller.ts', ['ClinicController']),
    evidence('clinic-test', 'Clinic tests exist', 'apps/api/src/modules/clinic/clinic.test.ts', ['clinic']),
  ]),
  moduleDefinition('procurement', 'Procurement', ['requests', 'approvals', 'suppliers', 'invoices', 'budgets', 'receiving'], [
    evidence('procurement-controller', 'Procurement controller exists', 'apps/api/src/modules/procurement/procurement.controller.ts', [
      'ProcurementController',
    ]),
    evidence('procurement-ui', 'Procurement workspace exists', 'apps/web/src/components/modules/procurement/procurement-module-screen.tsx', [
      'Procurement',
    ]),
  ]),
  moduleDefinition('hostel', 'Hostel', ['beds', 'occupancy', 'inspections', 'visitors', 'attendance', 'curfew'], [
    evidence('hostel-controller', 'Hostel controller exists', 'apps/api/src/modules/hostel/hostel.controller.ts', ['HostelController']),
    evidence('hostel-ui', 'Hostel workspace exists', 'apps/web/src/components/modules/hostel/hostel-module-screen.tsx', ['Hostel']),
  ]),
  moduleDefinition('boarding', 'Boarding Management', ['dormitories', 'discipline', 'meals', 'houses', 'roll-calls', 'welfare'], [
    evidence('boarding-controller', 'Boarding controller exists', 'apps/api/src/modules/boarding/boarding.controller.ts', ['BoardingController']),
    evidence('boarding-ui', 'Boarding workspace exists', 'apps/web/src/components/modules/boarding/boarding-module-screen.tsx', ['Boarding']),
  ]),
  moduleDefinition('cbt_exams', 'CBT Exams', ['online-exams', 'randomization', 'auto-marking', 'lockdown', 'proctoring', 'banks'], [
    evidence('cbt-controller', 'CBT controller exists', 'apps/api/src/modules/cbt/cbt.controller.ts', ['CbtController']),
    evidence('cbt-ui', 'CBT workspace exists', 'apps/web/src/components/modules/cbt/cbt-module-screen.tsx', ['Cbt']),
  ]),
  moduleDefinition('lms', 'eLearning and LMS', ['materials', 'classes', 'discussions', 'quizzes', 'video', 'analytics'], [
    evidence('lms-controller', 'LMS controller exists', 'apps/api/src/modules/lms/lms.controller.ts', ['LmsController']),
    evidence('lms-ui', 'LMS workspace exists', 'apps/web/src/components/modules/lms/lms-module-screen.tsx', ['Lms']),
  ]),
  moduleDefinition('ai_insights', 'AI Insights', ['predictions', 'anomalies', 'optimization', 'summaries', 'recommendations', 'audit-logs'], [
    evidence('ai-controller', 'AI insights controller exists', 'apps/api/src/modules/ai-insights/ai-insights.controller.ts', [
      'AiInsightsController',
    ]),
    evidence('ai-governance-policy', 'AI insights governance policy exists', 'apps/api/src/modules/ai-insights/ai-governance-policy.ts', [
      'fee_default_prediction',
      'attendance_anomalies',
      'data_boundary',
    ]),
    evidence('ai-ui', 'AI insights workspace exists', 'apps/web/src/components/modules/ai-insights/ai-insights-module-screen.tsx', [
      'AiInsights',
    ]),
  ]),
  moduleDefinition('visitor_management', 'Visitor Management', ['registration', 'id-check', 'qr', 'badges', 'watchlists', 'alerts'], [
    evidence('visitors-controller', 'Visitors controller exists', 'apps/api/src/modules/visitors/visitors.controller.ts', ['VisitorsController']),
    evidence('visitors-ui', 'Visitor workspace exists', 'apps/web/src/components/modules/visitors/visitor-management-module-screen.tsx', [
      'Visitor',
    ]),
  ]),
  moduleDefinition('asset_tracking', 'Asset Tracking', ['registry', 'tags', 'repairs', 'maintenance', 'depreciation', 'movement'], [
    evidence('assets-controller', 'Assets controller exists', 'apps/api/src/modules/assets/assets.controller.ts', ['AssetsController']),
    evidence('assets-ui', 'Asset tracking workspace exists', 'apps/web/src/components/modules/assets/asset-tracking-module-screen.tsx', [
      'Asset',
    ]),
  ]),
  moduleDefinition('iot', 'IoT and Smart Campus', ['devices', 'sensors', 'attendance', 'energy', 'telemetry', 'automation'], [
    evidence('iot-controller', 'IoT controller exists', 'apps/api/src/modules/iot/iot.controller.ts', ['IotController']),
    evidence('iot-ui', 'IoT workspace exists', 'apps/web/src/components/modules/iot/iot-module-screen.tsx', ['Iot']),
  ]),
];
