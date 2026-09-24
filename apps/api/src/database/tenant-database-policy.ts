export type TenantDatabaseModel = 'shared_database_tenant_aware';
export type TenantEncryptionKeyScope = 'per_tenant' | 'shared' | 'none';

export type TenantDatabaseTableRequirement = {
  name: string;
  group: 'core' | 'module' | 'activation';
  requiresTenantId: boolean;
  requiresForcedRls: boolean;
  moduleCode?: string;
};

export type PlatformCatalogTable = {
  name: string;
  tenantActivationTable: string;
  reason: string;
};

export type TenantDatabasePolicyInput = {
  activeModules: readonly string[];
};

export type TenantDatabasePolicy = {
  model: TenantDatabaseModel;
  requiredTenantColumn: 'tenant_id';
  requiredTables: TenantDatabaseTableRequirement[];
  platformCatalogTables: readonly PlatformCatalogTable[];
  isolationControls: readonly string[];
  encryption: {
    requiredKeyScope: 'per_tenant';
    backupEncryptionRequired: true;
  };
};

export type SqlSchemaTableSnapshot = {
  name: string;
  columns: string[];
  rowLevelSecurity: boolean;
  forcedRowLevelSecurity: boolean;
};

export type TenantSchemaSnapshot = {
  tables: readonly SqlSchemaTableSnapshot[];
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    backupEncrypted: boolean;
    keyScope: TenantEncryptionKeyScope;
  };
  runtimeControls: {
    tenantContextSessionSettings: boolean;
    tenantBoundGuard: boolean;
    auditLogTenantScope: boolean;
  };
};

export type TenantDatabasePolicyIssue = {
  id: string;
  severity: 'critical' | 'high';
  message: string;
};

export type TenantDatabasePolicyResult = {
  ok: boolean;
  issues: TenantDatabasePolicyIssue[];
};

const CORE_TABLES = [
  'tenants',
  'users',
  'roles',
  'permissions',
  'subscriptions',
  'audit_logs',
] as const;

const ACTIVATION_TABLES = ['school_module_access'] as const;

const MODULE_TABLES: Record<string, readonly string[]> = {
  students: ['students', 'student_guardians'],
  admissions: ['admission_applications', 'admission_workflow_steps'],
  academics: ['academic_years', 'academic_terms', 'classes', 'streams', 'subjects'],
  finance: ['fee_structures', 'invoices', 'usage_records', 'manual_fee_payments'],
  exams: [
    'exam_series',
    'exam_marks',
    'student_report_cards',
    'exam_report_card_signatures',
    'report_source_versions',
    'report_work',
    'report_pdf_cache',
    'report_object_uploads',
  ],
  discipline: ['discipline_incidents', 'discipline_actions', 'counselling_sessions'],
  timetable: ['timetable_periods', 'timetable_lessons', 'lesson_substitutions'],
  lab_management: ['lab_inventory', 'lab_sessions', 'lab_hazard_logs'],
  teacher_biometric_attendance: ['teacher_attendance_events', 'attendance_devices'],
  parent_portal: ['parent_student_links', 'parent_messages'],
  inventory: ['inventory_items', 'inventory_movements', 'supplier_records'],
  library: ['library_books', 'library_loans', 'library_fines'],
  transport: ['transport_routes', 'transport_vehicles', 'student_transport_manifests'],
  communication_sms: ['school_sms_wallets', 'school_integrations', 'sms_logs'],
  reports: ['report_export_jobs', 'report_snapshots'],
  staff: ['staff_profiles', 'staff_leave_requests', 'staff_documents'],
  admin_command_centers: ['leadership_approvals', 'front_office_events'],
  principal_dashboard: ['executive_kpi_snapshots', 'executive_alerts'],
  clinic_health: ['clinic_visits', 'student_health_profiles', 'medicine_inventory'],
  procurement: ['purchase_requests', 'supplier_quotes', 'goods_receipts'],
  hostel: ['hostel_beds', 'hostel_allocations', 'hostel_inspections'],
  boarding: ['boarding_roll_calls', 'boarding_houses', 'meal_consumption_logs'],
  cbt_exams: ['cbt_exam_sessions', 'cbt_question_banks', 'cbt_responses'],
  lms: ['learning_materials', 'virtual_classrooms', 'online_quizzes'],
  ai_insights: ['ai_insight_audit_logs', 'ai_risk_scores'],
  visitor_management: ['visitor_checkins', 'visitor_watchlist_entries'],
  asset_tracking: ['asset_registry', 'asset_movements', 'asset_maintenance'],
  iot: ['iot_devices', 'iot_telemetry_events', 'smart_campus_alerts'],
};

export const TENANT_DATABASE_BLUEPRINT = {
  model: 'shared_database_tenant_aware',
  requiredTenantColumn: 'tenant_id',
  coreTables: CORE_TABLES,
  platformCatalogTables: [
    {
      name: 'module_registry',
      tenantActivationTable: 'school_module_access',
      reason: 'Global module definitions are inert catalog data until activated per tenant.',
    },
  ],
  isolationControls: [
    'tenant_context_session_settings',
    'tenant_bound_guard',
    'forced_row_level_security',
    'tenant_scoped_audit_logs',
    'tenant_scoped_foreign_keys',
  ],
  encryption: {
    requiredKeyScope: 'per_tenant',
    backupEncryptionRequired: true,
  },
} as const;

export function buildTenantDatabasePolicy(
  input: TenantDatabasePolicyInput,
): TenantDatabasePolicy {
  const requiredTables = new Map<string, TenantDatabaseTableRequirement>();

  for (const table of CORE_TABLES) {
    requiredTables.set(table, tableRequirement(table, 'core'));
  }

  for (const table of ACTIVATION_TABLES) {
    requiredTables.set(table, tableRequirement(table, 'activation'));
  }

  for (const moduleCode of input.activeModules) {
    const tables = MODULE_TABLES[moduleCode] ?? [];

    for (const table of tables) {
      requiredTables.set(table, tableRequirement(table, 'module', moduleCode));
    }
  }

  return {
    model: TENANT_DATABASE_BLUEPRINT.model,
    requiredTenantColumn: TENANT_DATABASE_BLUEPRINT.requiredTenantColumn,
    requiredTables: [...requiredTables.values()],
    platformCatalogTables: TENANT_DATABASE_BLUEPRINT.platformCatalogTables,
    isolationControls: TENANT_DATABASE_BLUEPRINT.isolationControls,
    encryption: TENANT_DATABASE_BLUEPRINT.encryption,
  };
}

export function evaluateTenantSchemaSnapshot(
  snapshot: TenantSchemaSnapshot,
  policy: TenantDatabasePolicy,
): TenantDatabasePolicyResult {
  const tables = new Map(
    snapshot.tables.map((table) => [normalizeName(table.name), normalizeTable(table)]),
  );
  const issues: TenantDatabasePolicyIssue[] = [];

  for (const required of policy.requiredTables) {
    const actual = tables.get(normalizeName(required.name));

    if (!actual) {
      issues.push(issue(`missing-table:${required.name}`, 'critical', `${required.name} table is required.`));
      continue;
    }

    if (
      required.requiresTenantId &&
      !actual.columns.some((column) => normalizeName(column) === policy.requiredTenantColumn)
    ) {
      issues.push(issue(
        `missing-tenant-id:${required.name}`,
        'critical',
        `${required.name} must include ${policy.requiredTenantColumn}.`,
      ));
    }

    if (required.requiresForcedRls && !actual.forcedRowLevelSecurity) {
      issues.push(issue(
        `missing-forced-rls:${required.name}`,
        'critical',
        `${required.name} must force row-level security.`,
      ));
    }
  }

  for (const catalog of policy.platformCatalogTables) {
    if (!tables.has(normalizeName(catalog.name))) {
      issues.push(issue(`missing-catalog:${catalog.name}`, 'high', `${catalog.name} catalog table is required.`));
    }

    if (!tables.has(normalizeName(catalog.tenantActivationTable))) {
      issues.push(issue(
        `missing-table:${catalog.tenantActivationTable}`,
        'critical',
        `${catalog.name} must be paired with tenant activation table ${catalog.tenantActivationTable}.`,
      ));
    }
  }

  if (!snapshot.encryption.atRest) {
    issues.push(issue('at-rest-encryption-required', 'critical', 'Database encryption at rest is required.'));
  }

  if (!snapshot.encryption.inTransit) {
    issues.push(issue('in-transit-encryption-required', 'critical', 'Database encryption in transit is required.'));
  }

  if (!snapshot.encryption.backupEncrypted) {
    issues.push(issue('backup-encryption-required', 'critical', 'Tenant backups must be encrypted.'));
  }

  if (snapshot.encryption.keyScope !== policy.encryption.requiredKeyScope) {
    issues.push(issue('tenant-key-scope-required', 'critical', 'Tenant-level encryption keys are required.'));
  }

  if (!snapshot.runtimeControls.tenantContextSessionSettings) {
    issues.push(issue('tenant-session-context-required', 'critical', 'Database sessions must set tenant context.'));
  }

  if (!snapshot.runtimeControls.tenantBoundGuard) {
    issues.push(issue('tenant-bound-guard-required', 'critical', 'Tenant-bound request guard is required.'));
  }

  if (!snapshot.runtimeControls.auditLogTenantScope) {
    issues.push(issue('tenant-audit-scope-required', 'critical', 'Audit logs must stay tenant scoped.'));
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function extractSqlSchemaTables(sql: string): SqlSchemaTableSnapshot[] {
  const createTablePattern = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\);/gi;
  const tables: SqlSchemaTableSnapshot[] = [];
  let match: RegExpExecArray | null;

  while ((match = createTablePattern.exec(sql)) !== null) {
    const [, rawName, body] = match;
    const name = normalizeName(rawName ?? '');

    tables.push({
      name,
      columns: extractColumnNames(body ?? ''),
      rowLevelSecurity: hasRlsStatement(sql, name, 'ENABLE'),
      forcedRowLevelSecurity: hasRlsStatement(sql, name, 'FORCE'),
    });
  }

  return tables;
}

function tableRequirement(
  name: string,
  group: TenantDatabaseTableRequirement['group'],
  moduleCode?: string,
): TenantDatabaseTableRequirement {
  return {
    name,
    group,
    moduleCode,
    requiresTenantId: true,
    requiresForcedRls: true,
  };
}

function normalizeTable(table: SqlSchemaTableSnapshot): SqlSchemaTableSnapshot {
  return {
    ...table,
    name: normalizeName(table.name),
    columns: table.columns.map(normalizeName),
  };
}

function extractColumnNames(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/,$/, ''))
    .map((line) => line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+/)?.[1])
    .filter((column): column is string => Boolean(column))
    .filter((column) => !isConstraintKeyword(column))
    .map(normalizeName);
}

function hasRlsStatement(sql: string, tableName: string, mode: 'ENABLE' | 'FORCE'): boolean {
  return new RegExp(
    `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?${escapeRegExp(tableName)}\\s+${mode}\\s+ROW\\s+LEVEL\\s+SECURITY`,
    'i',
  ).test(sql);
}

function isConstraintKeyword(value: string): boolean {
  return [
    'constraint',
    'primary',
    'foreign',
    'unique',
    'check',
    'exclude',
  ].includes(value.toLowerCase());
}

function issue(
  id: string,
  severity: TenantDatabasePolicyIssue['severity'],
  message: string,
): TenantDatabasePolicyIssue {
  return { id, severity, message };
}

function normalizeName(value: string): string {
  return value.trim().replace(/^"|"$/g, '').toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
