import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type Implementation21CertificationStatus = 'pass' | 'fail';

interface EvidenceCheck {
  id: string;
  label: string;
  file: string;
  pattern: RegExp;
}

interface CertificationArea {
  id: string;
  title: string;
  checks: EvidenceCheck[];
}

export interface Implementation21CertificationOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export interface Implementation21CertificationResult {
  generated_at: string;
  ok: boolean;
  areas: Array<{
    id: string;
    evidence_id: string;
    title: string;
    status: Implementation21CertificationStatus;
    checks: Array<{
      id: string;
      label: string;
      file: string;
      status: Implementation21CertificationStatus;
    }>;
  }>;
}

const CERTIFICATION_AREAS: CertificationArea[] = [
  area('principal-executive-dashboard', 'Module-aware principal executive dashboard', [
    check('provider-registry', 'Dashboard sections are provider-configured by module', 'apps/api/src/modules/admin-command/principal-insights.providers.ts', /(?=.*clinic_health)(?=.*finance)(?=.*lab_management)(?=.*communication_sms)/s),
    check('module-filtering', 'Dashboard service filters sections by enabled tenant modules', 'apps/api/src/modules/admin-command/principal-insights.service.ts', /listCurrentTenantModules[\s\S]+enabledModules\.includes/),
    check('summary-confidentiality', 'Sensitive clinic and finance sections are summary-only', 'apps/api/src/modules/admin-command/principal-insights.providers.ts', /(?=.*clinic_health[\s\S]+summary_only)(?=.*finance[\s\S]+summary_only)/s),
    check('deterministic-ai-alerts', 'AI smart alert widgets are deterministic cross-module risk rules', 'apps/api/src/modules/admin-command/principal-insights.providers.ts', /(?=.*ai_insights)(?=.*fee_default_risk_alerts)(?=.*medicine_shortage_predictions)(?=.*attendance_irregularities)(?=.*budget_overrun_alerts)(?=.*performance_decline_warnings)/s),
    check('deterministic-ai-rules', 'AI smart alert metrics are computed from auditable module signals', 'apps/api/src/modules/admin-command/repositories/admin-command.repository.ts', /(?=.*case 'ai_insights')(?=.*fee_default_risk_alerts)(?=.*medicine_shortage_predictions)(?=.*attendance_irregularities)(?=.*budget_overrun_alerts)(?=.*performance_decline_warnings)/s),
    check('cache-and-realtime', 'Dashboard has a cache layer and realtime channel hints', 'apps/api/src/modules/admin-command/principal-insights-cache.service.ts', /getOrSet[\s\S]+ttlSeconds/),
    check('principal-snapshot-schema', 'Principal dashboard snapshots and live alerts are tenant scoped with RLS', 'apps/api/src/modules/admin-command/admin-command-schema.service.ts', /(?=.*principal_dashboard_snapshots)(?=.*principal_alerts)(?=.*FORCE ROW LEVEL SECURITY)/s),
    check('principal-snapshot-repository', 'Principal dashboard snapshots are persisted and refreshed by tenant/module/filter hash', 'apps/api/src/modules/admin-command/repositories/admin-command.repository.ts', /(?=.*findPrincipalDashboardSnapshot)(?=.*upsertPrincipalDashboardSnapshot)(?=.*enabled_module_hash)(?=.*filter_hash)/s),
    check('principal-view-audit', 'Principal dashboard views are audit logged', 'apps/api/src/modules/admin-command/principal-insights.service.ts', /(?=.*appendAuditLog)(?=.*principal_dashboard\.viewed)/s),
    check('principal-module-gate', 'Principal endpoint requires the principal dashboard module', 'apps/api/src/modules/admin-command/admin-command.controller.ts', /principal\/dashboard[\s\S]+principal_dashboard/),
    check('principal-event-stream', 'Principal endpoint exposes a module-gated event stream', 'apps/api/src/modules/admin-command/admin-command.controller.ts', /@Sse\('principal\/dashboard\/stream'\)[\s\S]+principal_dashboard/),
    check('principal-stream-service', 'Principal stream emits tenant dashboard payload events', 'apps/api/src/modules/admin-command/principal-insights.service.ts', /(?=.*streamDashboard)(?=.*principal\.dashboard)(?=.*buildDashboardForTenant)/s),
    check('executive-ui', 'School UI renders the executive dashboard and module alerts', 'apps/web/src/components/school/school-pages.tsx', /(?=.*PrincipalExecutiveDashboardPage)(?=.*Notifications center)(?=.*enabled_modules)/s),
    check('executive-ui-stream', 'School UI subscribes to principal dashboard event updates', 'apps/web/src/components/school/school-pages.tsx', /new EventSource[\s\S]+principal\.dashboard/),
    check('admin-command-proxy', 'Web app proxies leadership API requests', 'apps/web/src/app/api/admin-command/[...path]/route.ts', /proxySchoolApiRequest[\s\S]+"\/admin-command"/),
    check('event-stream-proxy', 'School API proxy preserves text/event-stream responses', 'apps/web/src/lib/dashboard/server-api-proxy.ts', /text\/event-stream[\s\S]+upstreamResponse\.body/),
  ]),
  area('subscription-modularity', 'Modular subscription packages and dynamic UI loading', [
    check('expanded-registry', 'Registry includes Implementation 21 modules', 'apps/api/src/modules/module-access/module-access.constants.ts', /principal_dashboard[\s\S]+clinic_health[\s\S]+procurement[\s\S]+ai_insights/),
    check('package-schema', 'Module packages, trial windows, expiries, and usage events exist', 'apps/api/src/modules/module-access/module-access-schema.service.ts', /(?=.*module_packages)(?=.*trial_ends_at)(?=.*module_usage_events)/s),
    check('package-repository', 'Repository can create and clone module packages', 'apps/api/src/modules/module-access/module-access.repository.ts', /createModulePackage[\s\S]+cloneModulePackage[\s\S]+recordModuleUsage/),
    check('package-api', 'Superadmin package endpoints exist', 'apps/api/src/modules/module-access/module-access.controller.ts', /module-packages[\s\S]+clone/),
    check('frontend-module-map', 'Frontend maps clinic and principal dashboard module codes', 'apps/web/src/lib/module-access/module-access-map.ts', /principal_dashboard[\s\S]+clinic_health[\s\S]+clinic:\s+"clinic_health"/),
  ]),
  area('clinic-medicine-inventory', 'Clinic medicine inventory, dispensing, expiry, and analytics', [
    check('clinic-schema', 'Clinic schema includes medicine, batch, movement, visit, dispense, alert, procurement, and audit tables', 'apps/api/src/modules/clinic/clinic-schema.service.ts', /clinic_medicines[\s\S]+clinic_medicine_batches[\s\S]+clinic_stock_movements[\s\S]+clinic_visits[\s\S]+clinic_medicine_dispenses[\s\S]+clinic_alerts[\s\S]+clinic_procurement_recommendations[\s\S]+clinic_audit_logs/),
    check('append-only-stock', 'Clinic stock movements are append-only', 'apps/api/src/modules/clinic/clinic-schema.service.ts', /prevent_clinic_stock_movement_mutation[\s\S]+BEFORE DELETE ON clinic_stock_movements/),
    check('expired-block', 'Service blocks expired, quarantined, disposed, and recalled medicines', 'apps/api/src/modules/clinic/clinic.service.ts', /Expired medicine cannot be dispensed[\s\S]+quarantined[\s\S]+disposed[\s\S]+recalled/),
    check('auto-deduct', 'Repository deducts stock and writes dispense movement in one transaction', 'apps/api/src/modules/clinic/repositories/clinic.repository.ts', /withRequestTransaction[\s\S]+quantity_available = quantity_available -[\s\S]+clinic_medicine_dispenses[\s\S]+dispensed/),
    check('clinic-finance-safe-analytics', 'Clinic analytics include cost, wastage, emergency readiness, and most-used medicine summaries', 'apps/api/src/modules/clinic/repositories/clinic.repository.ts', /(?=.*medicine_consumption_cost_minor)(?=.*wastage_due_to_expiry_minor)(?=.*emergency_supply_ready_rate)(?=.*most_used_medicine)/s),
    check('expiry-low-stock-jobs', 'Clinic processor runs expiry and low-stock checks', 'apps/api/src/modules/clinic/clinic.processor.ts', /runTenantMedicineExpiryCheck[\s\S]+runTenantLowStockCheck/),
    check('procurement-recommendations', 'Clinic low-stock checks create procurement recommendations when procurement is enabled', 'apps/api/src/modules/clinic/clinic.service.ts', /createLowStockProcurementRecommendations[\s\S]+listEnabledModulesForTenant[\s\S]+procurement/),
    check('clinic-api-permissions', 'Clinic controller separates inventory, dispensing, reports, and parent history permissions', 'apps/api/src/modules/clinic/clinic.controller.ts', /clinic:inventory[\s\S]+clinic:dispense[\s\S]+clinic:reports[\s\S]+portal:read_own_children/),
    check('clinic-ui', 'School UI renders clinic medicine inventory and readiness metrics', 'apps/web/src/components/school/school-pages.tsx', /ClinicOperationsPage[\s\S]+Medicine batches[\s\S]+Readiness/),
    check('clinic-ui-finance-analytics', 'School UI renders finance-safe medicine economics and usage cards', 'apps/web/src/components/school/school-pages.tsx', /(?=.*ClinicOperationsPage)(?=.*medicine_consumption_cost_minor)(?=.*wastage_due_to_expiry_minor)(?=.*emergency_supply_ready_rate)(?=.*most_used_medicine)/s),
    check('clinic-proxy', 'Web app proxies clinic API and parent routes', 'apps/web/src/app/api/clinic/[...path]/route.ts', /isParentRoute[\s\S]+audience:\s+isParentRoute \? "portal" : "school"/),
  ]),
  area('parent-medical-history', 'Parent guardian medical history visibility', [
    check('guardian-link-check', 'Clinic service requires guardian linkage before parent history', 'apps/api/src/modules/clinic/clinic.service.ts', /isGuardianLinkedToStudent[\s\S]+Parent is not linked to this student/),
    check('confidential-redaction', 'Parent history redacts confidential clinician notes', 'apps/api/src/modules/clinic/clinic.service.ts', /redactMedicalHistoryForParent[\s\S]+confidential_notes/),
    check('parent-dispensed-drugs', 'Repository returns medicines dispensed to the child', 'apps/api/src/modules/clinic/repositories/clinic.repository.ts', /(?=.*medicines_dispensed)(?=.*medicine_name)(?=.*dosage)/s),
    check('portal-health-nav', 'Parent portal includes health section', 'apps/web/src/lib/experiences/portal-data.ts', /id:\s+"health"[\s\S]+label:\s+"Health"/),
    check('portal-health-ui', 'Portal UI fetches child medical history from the clinic parent endpoint', 'apps/web/src/components/portal/portal-pages.tsx', /PortalHealthPage[\s\S]+\/api\/clinic\/parent\/students\/\$\{encodeURIComponent/),
  ]),
  area('security-audit-rbac', 'RBAC, audit logging, and tenant safety', [
    check('clinic-permission-catalog', 'Clinic permissions and clinic staff role exist', 'apps/api/src/auth/auth.constants.ts', /clinic_staff[\s\S]+clinic:inventory[\s\S]+clinic:confidential/),
    check('clinic-rls', 'Clinic tables are tenant scoped with forced RLS', 'apps/api/src/modules/clinic/clinic-schema.service.ts', /ALTER TABLE \$\{table\} ENABLE ROW LEVEL SECURITY[\s\S]+FORCE ROW LEVEL SECURITY/),
    check('clinic-audit', 'Clinic service records audit events for inventory, visits, dispensing, and jobs', 'apps/api/src/modules/clinic/clinic.service.ts', /clinic\.medicine_created[\s\S]+clinic\.medicine_dispensed[\s\S]+clinic\.low_stock_check_completed/),
    check('principal-no-confidential-notes', 'Principal insights use clinic reports, not confidential permissions', 'apps/api/src/modules/admin-command/principal-insights.providers.ts', /permission_required:\s+'clinic:reports'[\s\S]+summary_only/),
  ]),
];

export function runImplementation21Certification(
  options: Implementation21CertificationOptions = {},
): Implementation21CertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const areas = CERTIFICATION_AREAS.map((definition, index) => {
    const checks = definition.checks.map((item) => {
      const source = readSource(workspaceRoot, item.file, options.sourceOverrides);
      const passed = item.pattern.test(source);

      return {
        id: item.id,
        label: item.label,
        file: item.file,
        status: passed ? 'pass' as const : 'fail' as const,
      };
    });

    return {
      id: definition.id,
      evidence_id: `IMPLEMENTATION21-${String(index + 1).padStart(3, '0')}-${definition.id}`,
      title: definition.title,
      status: checks.every((item) => item.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: areas.every((result) => result.status === 'pass'),
    areas,
  };
}

export function renderImplementation21CertificationMarkdown(
  result: Implementation21CertificationResult,
): string {
  const lines = [
    '# Implementation 21 Certification',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    '| Evidence ID | Area | Status | Checks |',
    '| --- | --- | --- | --- |',
  ];

  for (const areaResult of result.areas) {
    lines.push(
      `| ${areaResult.evidence_id} | ${escapeTable(areaResult.title)} | ${areaResult.status} | ${escapeTable(areaResult.checks.map((item) => `${item.status}: ${item.label}`).join('; '))} |`,
    );
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- This certification checks source-level release evidence for principal executive insights, modular subscriptions, clinic medicine inventory, parent medical history, and RBAC/audit controls.',
    '- Principal and parent views intentionally expose summary or guardian-visible medical information only.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeImplementation21CertificationArtifact(
  result: Implementation21CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderImplementation21CertificationMarkdown(result), 'utf8');
}

export function runAndWriteImplementation21Certification(
  workspaceRoot = process.cwd(),
): Implementation21CertificationResult {
  const result = runImplementation21Certification({ workspaceRoot });
  const outputPath = join(workspaceRoot, 'docs', 'validation', 'implementation21-certification.md');
  writeImplementation21CertificationArtifact(result, outputPath);
  return result;
}

function area(id: string, title: string, checks: EvidenceCheck[]): CertificationArea {
  return { id, title, checks };
}

function check(id: string, label: string, file: string, pattern: RegExp): EvidenceCheck {
  return { id, label, file, pattern };
}

function readSource(
  workspaceRoot: string,
  relativePath: string,
  sourceOverrides?: Record<string, string>,
): string {
  if (sourceOverrides?.[relativePath] !== undefined) {
    return sourceOverrides[relativePath];
  }

  const filePath = join(workspaceRoot, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function main(): void {
  const result = runAndWriteImplementation21Certification();

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
