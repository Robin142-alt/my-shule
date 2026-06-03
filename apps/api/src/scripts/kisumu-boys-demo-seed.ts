import { createHash } from 'node:crypto';

import { Client } from 'pg';

export const KISUMU_BOYS_DEMO_SEED_KEY = 'kisumu-boys-demo-v1';

export const DEMO_MODULE_CODES = [
  'academics',
  'admin_command_centers',
  'admissions',
  'ai_insights',
  'asset_tracking',
  'boarding',
  'cbt_exams',
  'clinic_health',
  'communication_sms',
  'discipline',
  'exams',
  'finance',
  'hostel',
  'inventory',
  'iot',
  'lab_management',
  'library',
  'lms',
  'parent_portal',
  'principal_dashboard',
  'procurement',
  'reports',
  'staff',
  'students',
  'teacher_biometric_attendance',
  'timetable',
  'transport',
  'visitor_management',
] as const;

type DemoModuleCode = typeof DEMO_MODULE_CODES[number];

type TenantSelectionRow = {
  id: string;
  tenant_id: string;
  name: string;
  subdomain: string;
};

type DemoSeedOperation = {
  moduleCode: DemoModuleCode | 'platform';
  table: string;
  tenantScoped: true;
};

type DemoSeedPlan = {
  seedKey: string;
  targetTenant: {
    tenant_id: 'kb-high';
    name: 'Kisumu Boys';
    subdomain: 'kb-high';
  };
  operations: DemoSeedOperation[];
};

type DemoStudentRosterEntry = {
  firstName: string;
  lastName: string;
  gender: 'male';
  admissionNumber: string;
  className: 'Grade 10 Blue' | 'Form 3 West' | 'Form 4 South';
  classIndex: number;
  guardian: {
    fullName: string;
    phone: string;
    email: string;
    relationship: 'father' | 'mother' | 'guardian';
    occupation: string;
  };
};

type DemoLibraryCatalogItem = {
  title: string;
  author: string;
  isbn: string;
  category: 'Literature' | 'Science' | 'Mathematics' | 'Revision' | 'History' | 'Computer Studies';
  copies: Array<{
    accessionNumber: string;
    barcode: string;
    status: 'available' | 'issued' | 'lost' | 'damaged';
  }>;
};

type SeedSummary = {
  tenant_id: string;
  tenant_name: string;
  seed_key: string;
  dry_run: boolean;
  tables: Record<string, number>;
  skipped_tables: string[];
  access: ReturnType<typeof buildKisumuBoysDemoAccessSummary>;
  existing_users_by_role: Record<string, number>;
  module_access_enabled: number;
  outside_demo_rows: number;
};

type TableColumn = {
  column_name: string;
  data_type: string;
};

type DemoContext = {
  tenant: TenantSelectionRow;
  actorUserId: string;
  teacherUserId: string;
  librarianUserId: string;
  billingSubscriptionId: string;
  existingUsersByRole: Record<string, number>;
  now: Date;
};

type Row = Record<string, unknown>;

const DEMO_META = {
  demo_seed_key: KISUMU_BOYS_DEMO_SEED_KEY,
  demo_school: 'Kisumu Boys',
};

const PLAN_OPERATIONS: DemoSeedOperation[] = [
  { moduleCode: 'platform', table: 'tenants', tenantScoped: true },
  { moduleCode: 'platform', table: 'school_module_access', tenantScoped: true },
  { moduleCode: 'academics', table: 'academic_years', tenantScoped: true },
  { moduleCode: 'academics', table: 'academic_terms', tenantScoped: true },
  { moduleCode: 'academics', table: 'academic_levels', tenantScoped: true },
  { moduleCode: 'academics', table: 'class_sections', tenantScoped: true },
  { moduleCode: 'academics', table: 'class_streams', tenantScoped: true },
  { moduleCode: 'academics', table: 'school_classes', tenantScoped: true },
  { moduleCode: 'academics', table: 'streams', tenantScoped: true },
  { moduleCode: 'academics', table: 'student_enrollments', tenantScoped: true },
  { moduleCode: 'academics', table: 'subjects', tenantScoped: true },
  { moduleCode: 'academics', table: 'class_subject_assignments', tenantScoped: true },
  { moduleCode: 'academics', table: 'teacher_subject_assignments', tenantScoped: true },
  { moduleCode: 'students', table: 'students', tenantScoped: true },
  { moduleCode: 'students', table: 'guardians', tenantScoped: true },
  { moduleCode: 'students', table: 'student_guardians', tenantScoped: true },
  { moduleCode: 'students', table: 'attendance_records', tenantScoped: true },
  { moduleCode: 'staff', table: 'staff_departments', tenantScoped: true },
  { moduleCode: 'staff', table: 'staff_job_titles', tenantScoped: true },
  { moduleCode: 'staff', table: 'staff_members', tenantScoped: true },
  { moduleCode: 'staff', table: 'staff_profiles', tenantScoped: true },
  { moduleCode: 'staff', table: 'staff_contracts', tenantScoped: true },
  { moduleCode: 'staff', table: 'staff_leave_balances', tenantScoped: true },
  { moduleCode: 'staff', table: 'staff_leave_requests', tenantScoped: true },
  { moduleCode: 'teacher_biometric_attendance', table: 'biometric_devices', tenantScoped: true },
  { moduleCode: 'teacher_biometric_attendance', table: 'biometric_identities', tenantScoped: true },
  { moduleCode: 'teacher_biometric_attendance', table: 'biometric_events', tenantScoped: true },
  { moduleCode: 'teacher_biometric_attendance', table: 'teacher_attendance_logs', tenantScoped: true },
  { moduleCode: 'finance', table: 'accounts', tenantScoped: true },
  { moduleCode: 'finance', table: 'transactions', tenantScoped: true },
  { moduleCode: 'finance', table: 'ledger_entries', tenantScoped: true },
  { moduleCode: 'finance', table: 'fee_structures', tenantScoped: true },
  { moduleCode: 'finance', table: 'subscriptions', tenantScoped: true },
  { moduleCode: 'finance', table: 'invoices', tenantScoped: true },
  { moduleCode: 'finance', table: 'manual_fee_payments', tenantScoped: true },
  { moduleCode: 'finance', table: 'manual_fee_payment_allocations', tenantScoped: true },
  { moduleCode: 'finance', table: 'billing_notifications', tenantScoped: true },
  { moduleCode: 'finance', table: 'payment_intents', tenantScoped: true },
  { moduleCode: 'finance', table: 'mpesa_c2b_payments', tenantScoped: true },
  { moduleCode: 'admissions', table: 'admission_applications', tenantScoped: true },
  { moduleCode: 'admissions', table: 'student_allocations', tenantScoped: true },
  { moduleCode: 'admissions', table: 'student_transfer_records', tenantScoped: true },
  { moduleCode: 'admissions', table: 'academic_class_sections', tenantScoped: true },
  { moduleCode: 'admissions', table: 'student_academic_enrollments', tenantScoped: true },
  { moduleCode: 'admissions', table: 'student_fee_structures', tenantScoped: true },
  { moduleCode: 'admissions', table: 'student_fee_assignments', tenantScoped: true },
  { moduleCode: 'admissions', table: 'student_fee_invoices', tenantScoped: true },
  { moduleCode: 'exams', table: 'exam_series', tenantScoped: true },
  { moduleCode: 'exams', table: 'exam_assessments', tenantScoped: true },
  { moduleCode: 'exams', table: 'exam_grading_policies', tenantScoped: true },
  { moduleCode: 'exams', table: 'exam_grading_policy_boundaries', tenantScoped: true },
  { moduleCode: 'exams', table: 'exam_marks', tenantScoped: true },
  { moduleCode: 'exams', table: 'student_report_cards', tenantScoped: true },
  { moduleCode: 'timetable', table: 'timetable_versions', tenantScoped: true },
  { moduleCode: 'timetable', table: 'timetable_slots', tenantScoped: true },
  { moduleCode: 'timetable', table: 'timetable_lessons', tenantScoped: true },
  { moduleCode: 'library', table: 'library_catalog_items', tenantScoped: true },
  { moduleCode: 'library', table: 'library_copies', tenantScoped: true },
  { moduleCode: 'library', table: 'library_borrowers', tenantScoped: true },
  { moduleCode: 'library', table: 'library_circulation_ledger', tenantScoped: true },
  { moduleCode: 'library', table: 'library_fines', tenantScoped: true },
  { moduleCode: 'library', table: 'library_audit_logs', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_categories', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_suppliers', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_items', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_locations', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_item_balances', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_stock_movements', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_purchase_orders', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_requests', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_routes', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_route_stops', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_vehicles', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_drivers', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_manifests', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_manifest_students', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_trips', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_trip_events', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_alerts', tenantScoped: true },
  { moduleCode: 'procurement', table: 'procurement_suppliers', tenantScoped: true },
  { moduleCode: 'procurement', table: 'procurement_requests', tenantScoped: true },
  { moduleCode: 'procurement', table: 'procurement_request_items', tenantScoped: true },
  { moduleCode: 'procurement', table: 'procurement_approvals', tenantScoped: true },
  { moduleCode: 'procurement', table: 'purchase_orders', tenantScoped: true },
  { moduleCode: 'procurement', table: 'purchase_order_items', tenantScoped: true },
  { moduleCode: 'procurement', table: 'supplier_invoices', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_locations', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_medicines', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_medicine_batches', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_visits', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_medicine_dispenses', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_alerts', tenantScoped: true },
  { moduleCode: 'lab_management', table: 'lab_departments', tenantScoped: true },
  { moduleCode: 'lab_management', table: 'labs', tenantScoped: true },
  { moduleCode: 'lab_management', table: 'lab_sessions', tenantScoped: true },
  { moduleCode: 'lab_management', table: 'lab_equipment', tenantScoped: true },
  { moduleCode: 'lab_management', table: 'chemical_items', tenantScoped: true },
  { moduleCode: 'lab_management', table: 'chemical_disposal_requests', tenantScoped: true },
  { moduleCode: 'discipline', table: 'offense_categories', tenantScoped: true },
  { moduleCode: 'discipline', table: 'discipline_incidents', tenantScoped: true },
  { moduleCode: 'discipline', table: 'discipline_actions', tenantScoped: true },
  { moduleCode: 'discipline', table: 'commendations', tenantScoped: true },
  { moduleCode: 'discipline', table: 'counselling_referrals', tenantScoped: true },
  { moduleCode: 'discipline', table: 'counselling_sessions', tenantScoped: true },
  { moduleCode: 'discipline', table: 'behavior_points', tenantScoped: true },
  { moduleCode: 'boarding', table: 'boarding_students', tenantScoped: true },
  { moduleCode: 'boarding', table: 'boarding_meals', tenantScoped: true },
  { moduleCode: 'boarding', table: 'boarding_dormitory_checks', tenantScoped: true },
  { moduleCode: 'boarding', table: 'boarding_incidents', tenantScoped: true },
  { moduleCode: 'hostel', table: 'hostel_rooms', tenantScoped: true },
  { moduleCode: 'hostel', table: 'hostel_allocations', tenantScoped: true },
  { moduleCode: 'hostel', table: 'hostel_issues', tenantScoped: true },
  { moduleCode: 'hostel', table: 'hostel_meal_consumption', tenantScoped: true },
  { moduleCode: 'cbt_exams', table: 'cbt_questions', tenantScoped: true },
  { moduleCode: 'cbt_exams', table: 'cbt_attempts', tenantScoped: true },
  { moduleCode: 'cbt_exams', table: 'cbt_responses', tenantScoped: true },
  { moduleCode: 'cbt_exams', table: 'cbt_invigilation_events', tenantScoped: true },
  { moduleCode: 'lms', table: 'lms_content_items', tenantScoped: true },
  { moduleCode: 'lms', table: 'lms_assignments', tenantScoped: true },
  { moduleCode: 'lms', table: 'lms_submissions', tenantScoped: true },
  { moduleCode: 'lms', table: 'lms_activity_events', tenantScoped: true },
  { moduleCode: 'ai_insights', table: 'ai_insight_alerts', tenantScoped: true },
  { moduleCode: 'ai_insights', table: 'ai_forecasts', tenantScoped: true },
  { moduleCode: 'ai_insights', table: 'ai_anomalies', tenantScoped: true },
  { moduleCode: 'ai_insights', table: 'ai_recommendations', tenantScoped: true },
  { moduleCode: 'visitor_management', table: 'visitor_appointments', tenantScoped: true },
  { moduleCode: 'visitor_management', table: 'visitor_badges', tenantScoped: true },
  { moduleCode: 'visitor_management', table: 'visitor_emergency_logs', tenantScoped: true },
  { moduleCode: 'asset_tracking', table: 'asset_assignments', tenantScoped: true },
  { moduleCode: 'asset_tracking', table: 'asset_repairs', tenantScoped: true },
  { moduleCode: 'asset_tracking', table: 'asset_depreciation_entries', tenantScoped: true },
  { moduleCode: 'iot', table: 'iot_devices', tenantScoped: true },
  { moduleCode: 'iot', table: 'iot_telemetry_readings', tenantScoped: true },
  { moduleCode: 'iot', table: 'iot_device_commands', tenantScoped: true },
  { moduleCode: 'iot', table: 'iot_alerts', tenantScoped: true },
  { moduleCode: 'communication_sms', table: 'school_sms_wallets', tenantScoped: true },
  { moduleCode: 'communication_sms', table: 'sms_logs', tenantScoped: true },
  { moduleCode: 'communication_sms', table: 'school_integrations', tenantScoped: true },
  { moduleCode: 'communication_sms', table: 'integration_logs', tenantScoped: true },
  { moduleCode: 'admin_command_centers', table: 'admin_incidents', tenantScoped: true },
  { moduleCode: 'admin_command_centers', table: 'announcements', tenantScoped: true },
  { moduleCode: 'admin_command_centers', table: 'meeting_minutes', tenantScoped: true },
  { moduleCode: 'admin_command_centers', table: 'duty_rosters', tenantScoped: true },
  { moduleCode: 'principal_dashboard', table: 'principal_alerts', tenantScoped: true },
  { moduleCode: 'reports', table: 'report_snapshots', tenantScoped: true },
  { moduleCode: 'reports', table: 'dashboard_summary_snapshots', tenantScoped: true },
  { moduleCode: 'parent_portal', table: 'consent_records', tenantScoped: true },
  { moduleCode: 'parent_portal', table: 'data_subject_requests', tenantScoped: true },
];

export function buildKisumuBoysDemoSeedPlan(): DemoSeedPlan {
  return {
    seedKey: KISUMU_BOYS_DEMO_SEED_KEY,
    targetTenant: {
      tenant_id: 'kb-high',
      name: 'Kisumu Boys',
      subdomain: 'kb-high',
    },
    operations: PLAN_OPERATIONS,
  };
}

export function buildKisumuBoysDemoStudentRoster(): DemoStudentRosterEntry[] {
  const names = [
    ['Brian', 'Otieno'],
    ['Kevin', 'Omondi'],
    ['Allan', 'Ochieng'],
    ['Felix', 'Odhiambo'],
    ['Victor', 'Onyango'],
    ['Samuel', 'Ouma'],
    ['Martin', 'Okello'],
    ['Dennis', 'Achieng'],
    ['George', 'Mboya'],
    ['Ibrahim', 'Juma'],
    ['Collins', 'Were'],
    ['Patrick', 'Oduor'],
    ['Caleb', 'Kiptoo'],
    ['David', 'Mwangi'],
    ['Emmanuel', 'Njoroge'],
    ['Francis', 'Kariuki'],
    ['Gabriel', 'Mutiso'],
    ['Hussein', 'Abdi'],
    ['Isaac', 'Barasa'],
    ['Joseph', 'Kiplagat'],
    ['Leon', 'Okoth'],
    ['Michael', 'Odede'],
    ['Nathan', 'Wekesa'],
    ['Oscar', 'Kiprono'],
    ['Peter', 'Maina'],
    ['Raymond', 'Okumu'],
    ['Simon', 'Muriuki'],
    ['Timothy', 'Koech'],
    ['Vincent', 'Mugambi'],
    ['Zachary', 'Owino'],
  ] as const;
  const classes = [
    { className: 'Grade 10 Blue' as const, classIndex: 0 },
    { className: 'Form 3 West' as const, classIndex: 1 },
    { className: 'Form 4 South' as const, classIndex: 2 },
  ];

  return names.map(([firstName, lastName], index) => {
    const assignedClass = classes[Math.floor(index / 10)] ?? classes[2];
    const phone = `+25471120${String(index + 1).padStart(2, '0')}`;
    const email = `guardian${index + 1}@kisumuboys.demo`;

    return {
      firstName,
      lastName,
      gender: 'male',
      admissionNumber: `KB-DEMO-${String(index + 1).padStart(3, '0')}`,
      ...assignedClass,
      guardian: {
        fullName: `${index % 2 === 0 ? 'Mr' : 'Mrs'} ${lastName}`,
        phone,
        email,
        relationship: index % 3 === 0 ? 'father' : index % 3 === 1 ? 'mother' : 'guardian',
        occupation: ['Trader', 'Teacher', 'Engineer', 'Nurse', 'Farmer', 'Civil Servant'][index % 6],
      },
    };
  });
}

export function buildKisumuBoysDemoLibraryCatalog(): DemoLibraryCatalogItem[] {
  const books = [
    ['Blossoms of the Savannah', 'Henry Ole Kulet', 'Literature'],
    ['The River and the Source', 'Margaret Ogola', 'Literature'],
    ['A Doll House', 'Henrik Ibsen', 'Literature'],
    ['The Pearl', 'John Steinbeck', 'Literature'],
    ['Fathers of Nations', 'Paul B. Vitta', 'Literature'],
    ['KCSE Chemistry Revision', 'Longhorn Publishers', 'Revision'],
    ['KCSE Biology Revision', 'Moran Publishers', 'Revision'],
    ['KCSE Physics Revision', 'Spotlight Publishers', 'Revision'],
    ['Top Mark Mathematics Form 3', 'Oxford Kenya', 'Mathematics'],
    ['Top Mark Mathematics Form 4', 'Oxford Kenya', 'Mathematics'],
    ['Secondary Mathematics Students Book 3', 'KLB', 'Mathematics'],
    ['Secondary Mathematics Students Book 4', 'KLB', 'Mathematics'],
    ['Chemistry Form 3 Students Book', 'KLB', 'Science'],
    ['Chemistry Form 4 Students Book', 'KLB', 'Science'],
    ['Biology Form 3 Students Book', 'KLB', 'Science'],
    ['Biology Form 4 Students Book', 'KLB', 'Science'],
    ['Physics Form 3 Students Book', 'KLB', 'Science'],
    ['Physics Form 4 Students Book', 'KLB', 'Science'],
    ['Certificate Geography Form 3', 'Oxford Kenya', 'History'],
    ['Certificate Geography Form 4', 'Oxford Kenya', 'History'],
    ['History and Government Form 3', 'KLB', 'History'],
    ['History and Government Form 4', 'KLB', 'History'],
    ['CRE Form 3 Students Book', 'KLB', 'History'],
    ['CRE Form 4 Students Book', 'KLB', 'History'],
    ['Computer Studies Form 3', 'KLB', 'Computer Studies'],
    ['Computer Studies Form 4', 'KLB', 'Computer Studies'],
    ['Computer Studies Practical Guide', 'Moran Publishers', 'Computer Studies'],
    ['Introduction to Python for Schools', 'Demo ICT Press', 'Computer Studies'],
    ['Business Studies Form 3', 'KLB', 'Revision'],
    ['Business Studies Form 4', 'KLB', 'Revision'],
    ['English Grammar for Secondary Schools', 'Longhorn Publishers', 'Revision'],
    ['Kiswahili Fasihi na Lugha', 'Moran Publishers', 'Revision'],
    ['Agriculture Form 3 Students Book', 'KLB', 'Science'],
    ['Agriculture Form 4 Students Book', 'KLB', 'Science'],
    ['Sports Science for Senior School', 'Demo Education Press', 'Science'],
    ['Atlas for Kenyan Secondary Schools', 'Oxford Kenya', 'History'],
    ['Mathematical Tables and Formulae', 'KNEC', 'Mathematics'],
    ['Set Book Study Guide', 'Spotlight Publishers', 'Literature'],
    ['Practical Chemistry Handbook', 'Demo Science Press', 'Science'],
    ['ICT Projects and Safety', 'Demo ICT Press', 'Computer Studies'],
  ] as const;

  return books.map(([title, author, category], index) => ({
    title,
    author,
    isbn: `KB-LIB-ISBN-${String(index + 1).padStart(3, '0')}`,
    category,
    copies: [1, 2].map((copyIndex) => {
      const copyNumber = index * 2 + copyIndex;
      return {
        accessionNumber: `KB-LIB-${String(copyNumber).padStart(4, '0')}`,
        barcode: `KB-BAR-${String(copyNumber).padStart(4, '0')}`,
        status: copyNumber === 17 ? 'lost' : copyNumber === 29 ? 'damaged' : copyNumber <= 18 ? 'issued' : 'available',
      };
    }),
  }));
}

export function summarizeExistingSchoolUsersByRole(rows: Array<{ user_id: string; role_code: string }>): Record<string, number> {
  return rows.reduce<Record<string, number>>((summary, row) => {
    const role = row.role_code.trim();

    if (!role) {
      return summary;
    }

    summary[role] = (summary[role] ?? 0) + 1;
    return summary;
  }, {});
}

export function buildKisumuBoysDemoAccessSummary() {
  return {
    school_login: '/school/login?tenant=kb-high',
    parent_login: '/parent/login?tenant=kb-high',
    common_password_supported: false,
    note: 'This seed does not create direct password credentials because MyShule production auth is invitation-only. Use the existing Kisumu Boys principal/admin account, then invite role users from Users & Invitations.',
  };
}

const KISUMU_BOYS_NOT_FOUND_MESSAGE = "ERROR: Existing demo school 'Kisumu Boys' not found. Seed aborted.";

export function assertKisumuBoysTenantSelection(rows: TenantSelectionRow[]): TenantSelectionRow {
  if (rows.length !== 1) {
    throw new Error(KISUMU_BOYS_NOT_FOUND_MESSAGE);
  }

  const tenant = rows[0];

  if (
    tenant.tenant_id !== 'kb-high'
    || tenant.subdomain !== 'kb-high'
    || tenant.name !== 'Kisumu Boys'
  ) {
    throw new Error(KISUMU_BOYS_NOT_FOUND_MESSAGE);
  }

  return tenant;
}

function demoUuid(key: string): string {
  const hash = createHash('sha256').update(`${KISUMU_BOYS_DEMO_SEED_KEY}:${key}`).digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function meta(extra: Record<string, unknown> = {}) {
  return {
    ...DEMO_META,
    ...extra,
  };
}

class DemoSeedWriter {
  private tableColumns = new Map<string, Map<string, TableColumn>>();
  private summary: SeedSummary;

  constructor(
    private readonly client: Client,
    private readonly tenant: TenantSelectionRow,
    dryRun: boolean,
  ) {
    this.summary = {
      tenant_id: tenant.tenant_id,
      tenant_name: tenant.name,
      seed_key: KISUMU_BOYS_DEMO_SEED_KEY,
      dry_run: dryRun,
      tables: {},
      skipped_tables: [],
      access: buildKisumuBoysDemoAccessSummary(),
      existing_users_by_role: {},
      module_access_enabled: 0,
      outside_demo_rows: 0,
    };
  }

  get result() {
    return this.summary;
  }

  async loadSchema(): Promise<void> {
    const result = await this.client.query<TableColumn & { table_name: string }>(
      `
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `,
    );

    for (const row of result.rows) {
      const columns = this.tableColumns.get(row.table_name) ?? new Map<string, TableColumn>();
      columns.set(row.column_name, row);
      this.tableColumns.set(row.table_name, columns);
    }
  }

  hasTable(table: string): boolean {
    return this.tableColumns.has(table);
  }

  setExistingUsersByRole(summary: Record<string, number>): void {
    this.summary.existing_users_by_role = summary;
  }

  async upsert(table: string, row: Row, conflictColumns = ['id']): Promise<string | null> {
    const columns = this.tableColumns.get(table);

    if (!columns) {
      if (!this.summary.skipped_tables.includes(table)) {
        this.summary.skipped_tables.push(table);
      }
      return null;
    }

    const filtered: Row = {};

    for (const [column, value] of Object.entries(row)) {
      const columnDefinition = columns.get(column);

      if (!columnDefinition || value === undefined) {
        continue;
      }

      filtered[column] = ['json', 'jsonb'].includes(columnDefinition.data_type) && value !== null
        ? JSON.stringify(value)
        : value;
    }

    if (!Object.keys(filtered).includes('tenant_id')) {
      throw new Error(`Seed row for ${table} is missing tenant_id.`);
    }

    if (filtered.tenant_id !== this.tenant.tenant_id) {
      throw new Error(`Seed row for ${table} targets ${String(filtered.tenant_id)} instead of ${this.tenant.tenant_id}.`);
    }

    const presentConflictColumns = conflictColumns.filter((column) => column in filtered);
    const entries = Object.entries(filtered);
    const columnSql = entries.map(([column]) => quoteIdentifier(column)).join(', ');
    const valueSql = entries.map((_, index) => `$${index + 1}`).join(', ');
    const values = entries.map(([, value]) => value);
    const updateColumns = entries
      .map(([column]) => column)
      .filter((column) => !presentConflictColumns.includes(column));
    const conflictSql = presentConflictColumns.length > 0
      ? ` ON CONFLICT (${presentConflictColumns.map(quoteIdentifier).join(', ')}) ${
          updateColumns.length > 0
            ? `DO UPDATE SET ${updateColumns.map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`).join(', ')}`
            : 'DO NOTHING'
        }`
      : '';
    const returning = columns.has('id') ? ' RETURNING id::text' : '';
    let result;

    try {
      result = await this.client.query(
        `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${valueSql})${conflictSql}${returning}`,
        values,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to seed ${table}: ${message}`);
    }

    this.summary.tables[table] = (this.summary.tables[table] ?? 0) + 1;
    return result.rows[0]?.id ?? (typeof filtered.id === 'string' ? filtered.id : null);
  }

  async insertOnce(table: string, row: Row, conflictColumns = ['id']): Promise<string | null> {
    const columns = this.tableColumns.get(table);

    if (!columns) {
      if (!this.summary.skipped_tables.includes(table)) {
        this.summary.skipped_tables.push(table);
      }
      return null;
    }

    const filtered: Row = {};

    for (const [column, value] of Object.entries(row)) {
      const columnDefinition = columns.get(column);

      if (!columnDefinition || value === undefined) {
        continue;
      }

      filtered[column] = ['json', 'jsonb'].includes(columnDefinition.data_type) && value !== null
        ? JSON.stringify(value)
        : value;
    }

    if (!Object.keys(filtered).includes('tenant_id')) {
      throw new Error(`Seed row for ${table} is missing tenant_id.`);
    }

    if (filtered.tenant_id !== this.tenant.tenant_id) {
      throw new Error(`Seed row for ${table} targets ${String(filtered.tenant_id)} instead of ${this.tenant.tenant_id}.`);
    }

    const presentConflictColumns = conflictColumns.filter((column) => column in filtered);
    const entries = Object.entries(filtered);
    const columnSql = entries.map(([column]) => quoteIdentifier(column)).join(', ');
    const valueSql = entries.map((_, index) => `$${index + 1}`).join(', ');
    const values = entries.map(([, value]) => value);
    const conflictSql = presentConflictColumns.length > 0
      ? ` ON CONFLICT (${presentConflictColumns.map(quoteIdentifier).join(', ')}) DO NOTHING`
      : '';
    const returning = columns.has('id') ? ' RETURNING id::text' : '';
    let result;

    try {
      result = await this.client.query(
        `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${valueSql})${conflictSql}${returning}`,
        values,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to seed ${table}: ${message}`);
    }

    if ((result.rowCount ?? 0) > 0) {
      this.summary.tables[table] = (this.summary.tables[table] ?? 0) + 1;
    }

    return result.rows[0]?.id ?? (typeof filtered.id === 'string' ? filtered.id : null);
  }

  async updateTenantMetadata(): Promise<void> {
    await this.client.query(
      `
        UPDATE tenants
        SET
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          settings = COALESCE(settings, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1
      `,
      [
        this.tenant.tenant_id,
        JSON.stringify(meta({ seeded_at: new Date().toISOString() })),
        JSON.stringify({
          demo_school: true,
          county: 'Kisumu',
          school_type: 'National boys boarding secondary',
        }),
      ],
    );
    this.summary.tables.tenants = 1;
  }

  async enableAllModules(actorUserId: string): Promise<void> {
    const result = await this.client.query<{ id: string }>(
      `
        INSERT INTO school_module_access (
          tenant_id,
          module_id,
          enabled,
          enabled_at,
          disabled_at,
          updated_by,
          access_level,
          trial_ends_at,
          expires_at,
          billing_plan_code,
          feature_flags,
          activation_reason
        )
        SELECT
          $1,
          id,
          TRUE,
          NOW(),
          NULL,
          $2::uuid,
          'standard',
          NULL,
          NULL,
          NULL,
          jsonb_build_object('demo_seed_key', $3::text, 'demo_school', 'Kisumu Boys'),
          'Kisumu Boys demo school modules enabled'
        FROM module_registry
        WHERE status = 'active'
        ON CONFLICT (tenant_id, module_id)
        DO UPDATE SET
          enabled = TRUE,
          enabled_at = COALESCE(school_module_access.enabled_at, NOW()),
          disabled_at = NULL,
          updated_by = EXCLUDED.updated_by,
          access_level = 'standard',
          trial_ends_at = NULL,
          expires_at = NULL,
          billing_plan_code = NULL,
          feature_flags = COALESCE(school_module_access.feature_flags, '{}'::jsonb) || EXCLUDED.feature_flags,
          activation_reason = EXCLUDED.activation_reason,
          updated_at = NOW()
        RETURNING id::text
      `,
      [this.tenant.tenant_id, actorUserId, KISUMU_BOYS_DEMO_SEED_KEY],
    );

    this.summary.module_access_enabled = result.rowCount ?? 0;
    this.summary.tables.school_module_access = result.rowCount ?? 0;
  }

  async countTaggedDemoRowsOutsideTarget(): Promise<number> {
    let total = 0;

    for (const [table, columns] of this.tableColumns) {
      if (!columns.has('tenant_id') || !columns.has('metadata')) {
        continue;
      }

      const result = await this.client.query<{ count: string }>(
        `
          SELECT COUNT(*)::int AS count
          FROM ${quoteIdentifier(table)}
          WHERE tenant_id <> $1
            AND metadata->>'demo_seed_key' = $2
        `,
        [this.tenant.tenant_id, KISUMU_BOYS_DEMO_SEED_KEY],
      );

      total += Number(result.rows[0]?.count ?? 0);
    }

    this.summary.outside_demo_rows = total;
    return total;
  }
}

async function resolveTenant(client: Client): Promise<TenantSelectionRow> {
  const result = await client.query<TenantSelectionRow>(
    `
      SELECT id::text, tenant_id, name, subdomain
      FROM tenants
      WHERE name = 'Kisumu Boys'
    `,
  );

  return assertKisumuBoysTenantSelection(result.rows);
}

async function resolveUsers(client: Client, tenantId: string) {
  const result = await client.query<{
    user_id: string;
    role_code: string;
  }>(
    `
      SELECT tm.user_id::text, r.code AS role_code
      FROM tenant_memberships tm
      JOIN roles r ON r.tenant_id = tm.tenant_id AND r.id = tm.role_id
      WHERE tm.tenant_id = $1
        AND tm.status = 'active'
      ORDER BY
        CASE r.code
          WHEN 'owner' THEN 1
          WHEN 'principal' THEN 2
          WHEN 'teacher' THEN 3
          WHEN 'librarian' THEN 4
          ELSE 9
        END
    `,
    [tenantId],
  );

  const actorUserId = result.rows.find((row) => row.role_code === 'owner' || row.role_code === 'principal')?.user_id
    ?? result.rows[0]?.user_id;

  if (!actorUserId) {
    throw new Error('Kisumu Boys must have at least one active user before demo data can be seeded.');
  }

  return {
    actorUserId,
    teacherUserId: result.rows.find((row) => row.role_code === 'teacher')?.user_id ?? actorUserId,
    librarianUserId: result.rows.find((row) => row.role_code === 'librarian')?.user_id ?? actorUserId,
    existingUsersByRole: summarizeExistingSchoolUsersByRole(result.rows),
  };
}

async function resolveActiveSubscriptionId(client: Client, tenantId: string): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      SELECT id::text
      FROM subscriptions
      WHERE tenant_id = $1
        AND status IN ('trialing', 'active', 'past_due', 'restricted', 'suspended')
      ORDER BY
        CASE status WHEN 'active' THEN 1 ELSE 2 END,
        updated_at DESC
      LIMIT 1
    `,
    [tenantId],
  );

  const subscriptionId = result.rows[0]?.id;

  if (!subscriptionId) {
    throw new Error('Kisumu Boys must have an active manual billing subscription before demo invoices can be seeded.');
  }

  return subscriptionId;
}

async function seedDemoRows(writer: DemoSeedWriter, context: DemoContext): Promise<void> {
  const tenantId = context.tenant.tenant_id;
  const yearId = demoUuid('academic-year-2026');
  const termId = demoUuid('academic-term-2026-term-2');
  const classDefinitions = [
    { key: 'grade-10-blue', code: 'G10B', name: 'Grade 10', stream: 'Blue', gradeOrder: 10, level: 'senior-school' },
    { key: 'form-3-west', code: 'F3W', name: 'Form 3', stream: 'West', gradeOrder: 3, level: 'secondary' },
    { key: 'form-4-south', code: 'F4S', name: 'Form 4', stream: 'South', gradeOrder: 4, level: 'secondary' },
  ] as const;
  const levelIds = classDefinitions.map(({ key }) => demoUuid(`level-${key}`));
  const classIds = classDefinitions.map(({ key }) => demoUuid(`class-${key}`));
  const streamIds = classDefinitions.map(({ key }) => demoUuid(`stream-${key}`));
  const subjectIds = ['mathematics', 'english', 'kiswahili', 'biology', 'chemistry', 'physics', 'history', 'business'].map((key) => demoUuid(`subject-${key}`));
  const studentRoster = buildKisumuBoysDemoStudentRoster();
  const studentIds = studentRoster.map((_, index) => demoUuid(`student-${index + 1}`));
  const guardianIds = studentRoster.map((_, index) => demoUuid(`guardian-${index + 1}`));
  const staffProfileIds = ['principal', 'math-teacher', 'lab-tech', 'nurse', 'bursar', 'librarian'].map((key) => demoUuid(`staff-${key}`));
  const classSubjectId = demoUuid('class-subject-math-form-1-north');
  const subscriptionId = context.billingSubscriptionId;
  const feeStructureId = demoUuid('fee-grade-10-term-2');
  const invoiceIds = studentRoster.map((_, index) => demoUuid(`invoice-${index + 1}`));
  const paymentId = demoUuid('manual-payment-1');
  const idempotencyId = demoUuid('idempotency-payment-1');
  const accountBank = demoUuid('account-bank');
  const accountFees = demoUuid('account-fees');
  const transactionId = demoUuid('transaction-fee-payment-1');
  const admissionApplicationId = demoUuid('admission-application-1');
  const examSeriesId = demoUuid('exam-series-midterm');
  const examAssessmentId = demoUuid('exam-assessment-math');
  const gradingPolicyId = demoUuid('grading-policy-main');
  const inventoryCategoryId = demoUuid('inventory-category-science');
  const inventoryItemId = demoUuid('inventory-item-exercise-books');
  const inventoryLocationId = demoUuid('inventory-location-main-store');
  const transportRouteId = demoUuid('transport-route-mamboleo');
  const transportStopId = demoUuid('transport-stop-kondele');
  const transportVehicleId = demoUuid('transport-vehicle-1');
  const transportDriverId = demoUuid('transport-driver-1');
  const transportManifestId = demoUuid('transport-manifest-1');
  const transportTripId = demoUuid('transport-trip-1');
  const procurementSupplierId = demoUuid('procurement-supplier-1');
  const procurementRequestId = demoUuid('procurement-request-1');
  const purchaseOrderId = demoUuid('purchase-order-1');
  const clinicLocationId = demoUuid('clinic-location-main');
  const clinicMedicineId = demoUuid('clinic-medicine-paracetamol');
  const clinicBatchId = demoUuid('clinic-batch-1');
  const clinicVisitId = demoUuid('clinic-visit-1');
  const labDepartmentId = demoUuid('lab-department-science');
  const labId = demoUuid('lab-chemistry-1');
  const labSessionId = demoUuid('lab-session-1');
  const labEquipmentId = demoUuid('lab-equipment-microscope');
  const chemicalId = demoUuid('chemical-ethanol');
  const offenseCategoryId = demoUuid('discipline-offense-lateness');
  const disciplineIncidentId = demoUuid('discipline-incident-1');
  const hostelRoomId = demoUuid('hostel-room-a1');
  const cbtQuestionId = demoUuid('cbt-question-1');
  const cbtAttemptId = demoUuid('cbt-attempt-1');
  const lmsContentId = demoUuid('lms-content-1');
  const lmsAssignmentId = demoUuid('lms-assignment-1');
  const visitorAppointmentId = demoUuid('visitor-appointment-1');
  const visitorBadgeId = demoUuid('visitor-badge-1');
  const iotDeviceId = demoUuid('iot-device-water-tank');
  const supportCategoryId = demoUuid('support-category-operations');
  const supportTicketId = demoUuid('support-ticket-1');

  await writer.updateTenantMetadata();

  await Promise.all([
    writer.upsert('academic_years', { id: yearId, tenant_id: tenantId, code: '2026', name: '2026 Academic Year', starts_on: '2026-01-08', ends_on: '2026-11-20', status: 'active', metadata: meta() }),
    writer.upsert('academic_terms', { id: termId, tenant_id: tenantId, academic_year_id: yearId, code: 'T2-2026', name: 'Term 2 2026', starts_on: '2026-05-04', ends_on: '2026-08-07', status: 'active', metadata: meta() }),
  ]);

  await writer.upsert('staff_members', { id: staffProfileIds[0], tenant_id: tenantId, user_id: context.actorUserId, employee_number: 'KB-STF-001', full_name: 'Mr Otieno', staff_type: 'admin', phone_number: '+25470010001', email: 'principal@kisumuboys.demo', metadata: meta() });
  await writer.upsert('staff_members', { id: staffProfileIds[1], tenant_id: tenantId, user_id: context.teacherUserId, employee_number: 'KB-STF-002', full_name: 'Shiro Wanjiru', staff_type: 'teacher', phone_number: '+25470010002', email: 'teacher@kisumuboys.demo', metadata: meta() });
  await writer.upsert('staff_members', { id: staffProfileIds[5], tenant_id: tenantId, user_id: context.librarianUserId, employee_number: 'KB-STF-006', full_name: 'Tabitha Njuguna', staff_type: 'admin', phone_number: '+25470010006', email: 'librarian@kisumuboys.demo', metadata: meta() });

  for (const [index, classDefinition] of classDefinitions.entries()) {
    const classLabel = `${classDefinition.name} ${classDefinition.stream}`;

    await writer.upsert('academic_levels', { id: levelIds[index], tenant_id: tenantId, system_type: classDefinition.name.startsWith('Grade') ? 'cbc' : '8-4-4', name: classDefinition.name, order_index: index + 1, is_active: true });
    await writer.upsert('class_sections', { id: classIds[index], tenant_id: tenantId, academic_year_id: yearId, academic_level_id: levelIds[index], name: classDefinition.name, grade_level: classDefinition.name, stream: classDefinition.stream, capacity: 45, status: 'active', is_active: true, created_by_user_id: context.actorUserId });
    await writer.upsert('class_streams', { id: streamIds[index], tenant_id: tenantId, class_section_id: classIds[index], name: classDefinition.stream, capacity: 45, class_teacher_id: context.teacherUserId, is_active: true });
    await writer.upsert('school_classes', { id: classIds[index], tenant_id: tenantId, code: classDefinition.code, name: classDefinition.name, grade_order: classDefinition.gradeOrder, level: classDefinition.level, metadata: meta({ label: classLabel }) });
    await writer.upsert('streams', { id: streamIds[index], tenant_id: tenantId, school_class_id: classIds[index], code: classDefinition.stream.slice(0, 1).toUpperCase(), name: classDefinition.stream, homeroom_staff_id: staffProfileIds[1], metadata: meta({ label: classLabel }) });
  }

  const subjects = [
    ['MAT', 'Mathematics'],
    ['ENG', 'English'],
    ['KIS', 'Kiswahili'],
    ['BIO', 'Biology'],
    ['CHE', 'Chemistry'],
    ['PHY', 'Physics'],
    ['HIS', 'History'],
    ['BST', 'Business Studies'],
  ];

  for (const [index, [code, name]] of subjects.entries()) {
    await writer.upsert('subjects', { id: subjectIds[index], tenant_id: tenantId, code, name, category: index < 6 ? 'core' : 'optional', status: 'active', metadata: meta() });
  }

  await writer.upsert('class_subject_assignments', { id: classSubjectId, tenant_id: tenantId, academic_year_id: yearId, academic_term_id: termId, school_class_id: classIds[0], class_section_id: classIds[0], stream_id: streamIds[0], subject_id: subjectIds[0], staff_member_id: staffProfileIds[1], lessons_per_week: 6, metadata: meta() });
  await writer.upsert('teacher_subject_assignments', { id: demoUuid('teacher-subject-math'), tenant_id: tenantId, academic_term_id: termId, class_section_id: classIds[0], subject_id: subjectIds[0], teacher_user_id: context.teacherUserId, weekly_lessons: 6, status: 'active' });
  await writer.upsert('academic_audit_logs', { id: demoUuid('academic-audit-1'), tenant_id: tenantId, entity_type: 'demo_seed', action: 'kisumu_boys_demo_seeded', actor_user_id: context.actorUserId, metadata: meta() });

  for (const [index, name] of ['Administration', 'Teaching', 'Health', 'Stores'].entries()) {
    await writer.upsert('staff_departments', { id: demoUuid(`department-${name}`), tenant_id: tenantId, name, description: `${name} department` });
    await writer.upsert('staff_job_titles', { id: demoUuid(`job-title-${name}`), tenant_id: tenantId, title: `${name} Lead`, description: `${name} role` });
  }

  const staffRows = [
    ['KB-STF-001', 'Mr Otieno', 'Principal', context.actorUserId, 'principal'],
    ['KB-STF-002', 'Shiro Wanjiru', 'Mathematics Teacher', context.teacherUserId, 'teacher'],
    ['KB-STF-003', 'Peter Ouma', 'Laboratory Technician', null, 'support'],
    ['KB-STF-004', 'Nurse Achieng', 'School Nurse', null, 'support'],
    ['KB-STF-005', 'David Odhiambo', 'Bursar', null, 'finance'],
    ['KB-STF-006', 'Tabitha Njuguna', 'Librarian', context.librarianUserId, 'support'],
  ] as const;

  for (const [index, [staffNumber, displayName, roleTitle, userId, staffType]] of staffRows.entries()) {
    await writer.upsert('staff_profiles', { id: staffProfileIds[index], tenant_id: tenantId, staff_number: staffNumber, display_name: displayName, user_id: userId, email: `${staffNumber.toLowerCase()}@kisumuboys.demo`, phone_number: `+25470010${String(index + 1).padStart(2, '0')}`, status: 'active' });
    await writer.upsert('staff_contracts', { id: demoUuid(`contract-${staffNumber}`), tenant_id: tenantId, staff_profile_id: staffProfileIds[index], role_title: roleTitle, starts_on: '2025-01-06', employment_type: 'permanent', workload: 'full_time', approval_state: 'approved' });
    await writer.upsert('staff_leave_balances', { id: demoUuid(`leave-balance-${staffNumber}`), tenant_id: tenantId, staff_profile_id: staffProfileIds[index], leave_type: 'annual', entitlement_days: 30, used_days: index % 3, remaining_days: 30 - (index % 3) });
  }

  await writer.upsert('staff_leave_requests', { id: demoUuid('leave-request-1'), tenant_id: tenantId, staff_profile_id: staffProfileIds[1], leave_type: 'annual', requested_days: 3, starts_on: '2026-06-15', ends_on: '2026-06-17', status: 'requested' });

  for (const [index, learner] of studentRoster.entries()) {
    const classIndex = learner.classIndex;

    await writer.upsert('students', {
      id: studentIds[index],
      tenant_id: tenantId,
      admission_number: learner.admissionNumber,
      first_name: learner.firstName,
      last_name: learner.lastName,
      gender: learner.gender,
      date_of_birth: `200${8 + (index % 3)}-0${(index % 8) + 1}-15`,
      status: 'active',
      primary_guardian_name: learner.guardian.fullName,
      primary_guardian_phone: learner.guardian.phone,
      created_by_user_id: context.actorUserId,
      metadata: meta({ class_name: learner.className, stream: streamIds[classIndex] }),
    });
    await writer.upsert('guardians', {
      id: guardianIds[index],
      tenant_id: tenantId,
      full_name: learner.guardian.fullName,
      phone_number: learner.guardian.phone,
      phone_lookup_key: learner.guardian.phone,
      email: learner.guardian.email,
      email_lookup_key: learner.guardian.email,
      occupation: learner.guardian.occupation,
      metadata: meta(),
    });
    await writer.upsert('student_guardians', {
      id: demoUuid(`student-guardian-${index + 1}`),
      tenant_id: tenantId,
      student_id: studentIds[index],
      guardian_id: guardianIds[index],
      relationship: learner.guardian.relationship,
      is_primary: true,
      can_receive_sms: true,
      display_name: learner.guardian.fullName,
      email: learner.guardian.email,
      phone: learner.guardian.phone,
      status: 'active',
      metadata: meta(),
    });
    await writer.upsert('student_class_assignments', { id: demoUuid(`student-class-${index + 1}`), tenant_id: tenantId, student_id: studentIds[index], class_section_id: classIds[classIndex], stream_id: streamIds[classIndex], academic_level_id: levelIds[classIndex], academic_year_id: yearId, status: 'active', metadata: meta({ class_name: learner.className }) });
    await writer.upsert('student_enrollments', { id: demoUuid(`student-enrollment-${index + 1}`), tenant_id: tenantId, student_id: studentIds[index], academic_year_id: yearId, academic_term_id: termId, school_class_id: classIds[classIndex], stream_id: streamIds[classIndex], status: 'active', metadata: meta({ class_name: learner.className }) });
    await writer.upsert('attendance_records', { id: demoUuid(`attendance-${index + 1}`), tenant_id: tenantId, student_id: studentIds[index], attendance_date: '2026-05-24', status: index % 11 === 0 ? 'absent' : index % 6 === 0 ? 'late' : 'present', notes: 'Demo attendance register', last_modified_at: context.now, metadata: meta({ class_name: learner.className }) });
  }

  await writer.upsert('subscriptions', { id: subscriptionId, tenant_id: tenantId, plan_code: 'enterprise', status: 'active', current_period_start: '2026-01-01', current_period_end: '2026-12-31', metadata: meta({ billing_control: 'manual_superadmin' }) });
  await writer.upsert('fee_structures', { id: feeStructureId, tenant_id: tenantId, academic_year_id: yearId, academic_term_id: termId, school_class_id: classIds[0], name: 'Grade 10 Term 2 Boarding Fees', academic_year: '2026', term: 'Term 2', grade_level: 'Grade 10', tuition_amount_minor: 4500000, transport_amount_minor: 0, lunch_amount_minor: 1200000, total_amount_minor: 5700000, metadata: meta() });
  await writer.upsert('accounts', { id: accountBank, tenant_id: tenantId, code: 'KB-BANK', name: 'Kisumu Boys Demo Bank', category: 'asset', normal_balance: 'debit', currency_code: 'KES', metadata: meta() });
  await writer.upsert('accounts', { id: accountFees, tenant_id: tenantId, code: 'KB-FEES', name: 'Fee Income Demo', category: 'revenue', normal_balance: 'credit', currency_code: 'KES', metadata: meta() });
  await writer.upsert('idempotency_keys', { id: idempotencyId, tenant_id: tenantId, scope: 'demo-fee-payment', idempotency_key: 'KB-DEMO-FEE-PAYMENT-1', request_method: 'POST', request_path: '/demo/kisumu-boys/fee-payment', request_hash: 'kisumu-boys-demo-fee-payment', status: 'completed', response_status_code: 201, response_body: meta(), completed_at: context.now, expires_at: '2027-05-24T00:00:00.000Z' });
  await writer.upsert('transactions', { id: transactionId, tenant_id: tenantId, idempotency_key_id: idempotencyId, reference: 'KB-DEMO-TXN-001', description: 'Demo fee payment receipt', currency_code: 'KES', total_amount_minor: 3000000, entry_count: 2, status: 'posted', metadata: meta() });
  await writer.upsert('ledger_entries', { id: demoUuid('ledger-debit-1'), tenant_id: tenantId, transaction_id: transactionId, account_id: accountBank, line_number: 1, direction: 'debit', amount_minor: 3000000, currency_code: 'KES', metadata: meta() });
  await writer.upsert('ledger_entries', { id: demoUuid('ledger-credit-1'), tenant_id: tenantId, transaction_id: transactionId, account_id: accountFees, line_number: 2, direction: 'credit', amount_minor: 3000000, currency_code: 'KES', metadata: meta() });

  for (const [index, invoiceId] of invoiceIds.entries()) {
    const paidMinor = index % 5 === 0 ? 5700000 : index % 3 === 0 ? 3000000 : 0;
    await writer.upsert('invoices', { id: invoiceId, tenant_id: tenantId, subscription_id: subscriptionId, student_id: studentIds[index], fee_structure_id: feeStructureId, invoice_number: `KB-DEMO-INV-${String(index + 1).padStart(3, '0')}`, description: 'Demo school fee invoice', subtotal_amount_minor: 5700000, total_amount_minor: 5700000, amount_paid_minor: paidMinor, status: paidMinor >= 5700000 ? 'paid' : 'open', due_at: '2026-06-30T12:00:00.000Z', metadata: meta({ class_name: studentRoster[index]?.className }) });
  }

  await writer.upsert('manual_fee_payments', { id: paymentId, tenant_id: tenantId, idempotency_key: 'KB-DEMO-MANUAL-PAYMENT-1', receipt_number: 'KB-DEMO-RCPT-001', invoice_id: invoiceIds[0], payment_method: 'mpesa_c2b', amount_minor: 3000000, paid_at: '2026-05-20T09:30:00.000Z', status: 'received', payer_name: 'Guardian Otieno', metadata: meta() });
  await writer.upsert('manual_fee_payment_allocations', { id: demoUuid('manual-payment-allocation-1'), tenant_id: tenantId, manual_payment_id: paymentId, invoice_id: invoiceIds[0], allocation_type: 'invoice', amount_minor: 3000000, metadata: meta() });
  await writer.upsert('billing_notifications', { id: demoUuid('billing-notification-1'), tenant_id: tenantId, subscription_id: subscriptionId, notification_key: 'KB-DEMO-BILLING-OK', channel: 'email', audience: 'owner', lifecycle_state: 'ACTIVE', title: 'Billing active for Kisumu Boys demo', body: 'Manual billing state is active.', status: 'sent', metadata: meta() });
  await writer.upsert('payment_intents', { id: demoUuid('payment-intent-1'), tenant_id: tenantId, idempotency_key_id: idempotencyId, account_reference: 'KB-DEMO-001', transaction_desc: 'Kisumu Boys demo fee payment', phone_number: '+25471120001', amount_minor: 3000000, status: 'completed', metadata: meta() });
  await writer.upsert('mpesa_c2b_payments', { id: demoUuid('mpesa-c2b-1'), tenant_id: tenantId, trans_id: 'KBDEMO001', transaction_type: 'Pay Bill', business_short_code: '123456', bill_ref_number: 'KB-DEMO-001', amount_minor: 3000000, received_at: '2026-05-20T09:30:00.000Z', metadata: meta() });

  await writer.upsert('admission_applications', { id: admissionApplicationId, tenant_id: tenantId, application_number: 'KB-ADM-DEMO-001', full_name: 'Moses Onyango', date_of_birth: '2012-03-14', gender: 'male', birth_certificate_number: 'KBDEMOBC001', nationality: 'Kenyan', class_applying: 'Form 1', parent_name: 'Grace Onyango', parent_phone: '+254722100001', relationship: 'mother', status: 'under_review' });
  await writer.upsert('student_allocations', { id: demoUuid('student-allocation-1'), tenant_id: tenantId, student_id: studentIds[0], class_name: 'Form 1', stream_name: 'North', dormitory_name: 'Victoria House', transport_route: 'Mamboleo Route', effective_from: '2026-05-04', is_current: true, notes: 'Kisumu Boys demo allocation' });
  await writer.upsert('student_transfer_records', { id: demoUuid('student-transfer-1'), tenant_id: tenantId, student_id: studentIds[3], transfer_type: 'internal', school_name: 'Kisumu Boys', reason: 'Demo stream balancing from Form 2 East to Form 2 North', requested_on: '2026-05-18', status: 'approved' });
  await writer.upsert('academic_class_sections', { id: demoUuid('admissions-class-section-1'), tenant_id: tenantId, class_name: 'Form 1', stream_name: 'North', academic_year: '2026', capacity: 45, status: 'active' });
  await writer.upsert('student_academic_enrollments', { id: demoUuid('student-academic-enrollment-1'), tenant_id: tenantId, student_id: studentIds[0], application_id: admissionApplicationId, class_name: 'Form 1', stream_name: 'North', academic_year: '2026', status: 'active' });
  await writer.upsert('student_fee_structures', { id: demoUuid('admissions-fee-structure-1'), tenant_id: tenantId, class_name: 'Form 1', academic_year: '2026', term_name: 'Term 2', description: 'Demo boarding fee', amount_minor: 5700000, status: 'active' });
  await writer.upsert('student_fee_assignments', { id: demoUuid('student-fee-assignment-1'), tenant_id: tenantId, student_id: studentIds[0], application_id: admissionApplicationId, fee_structure_id: demoUuid('admissions-fee-structure-1'), status: 'assigned', amount_minor: 5700000, metadata: meta() });
  await writer.upsert('student_fee_invoices', { id: demoUuid('student-fee-invoice-1'), tenant_id: tenantId, assignment_id: demoUuid('student-fee-assignment-1'), student_id: studentIds[0], invoice_number: 'KB-ADM-FEE-001', description: 'Admission fee invoice demo', amount_due_minor: 5700000, amount_paid_minor: 3000000, due_date: '2026-06-30', status: 'open' });

  await writer.upsert('exam_series', { id: examSeriesId, tenant_id: tenantId, academic_term_id: termId, name: 'Term 2 Midterm 2026', starts_on: '2026-06-10', ends_on: '2026-06-14', status: 'published' });
  await writer.upsert('exam_assessments', { id: examAssessmentId, tenant_id: tenantId, exam_series_id: examSeriesId, subject_id: subjectIds[0], name: 'Mathematics Paper 1', max_score: 100, weight: 100 });
  await writer.upsert('exam_grading_policies', { id: gradingPolicyId, tenant_id: tenantId, name: 'Kisumu Boys Demo Grading', status: 'active' });
  for (const [index, [label, min, max]] of [['A', 80, 100], ['B', 65, 79], ['C', 50, 64], ['D', 35, 49]].entries()) {
    await writer.upsert('exam_grading_policy_boundaries', { id: demoUuid(`grade-${label}`), tenant_id: tenantId, grading_policy_id: gradingPolicyId, label, min_score: min, max_score: max, points: 12 - index * 2 });
  }
  for (const [index, studentId] of studentIds.slice(0, 6).entries()) {
    await writer.upsert('exam_marks', { id: demoUuid(`exam-mark-${index + 1}`), tenant_id: tenantId, exam_series_id: examSeriesId, assessment_id: examAssessmentId, academic_term_id: termId, class_section_id: classIds[index % classIds.length], subject_id: subjectIds[0], student_id: studentId, score: 62 + index * 4, entered_by_user_id: context.teacherUserId, status: 'submitted' });
  }
  await writer.upsert('student_report_cards', { id: demoUuid('report-card-1'), tenant_id: tenantId, exam_series_id: examSeriesId, student_id: studentIds[0], report_snapshot_id: 'KB-DEMO-RPT-001', overall_grade: 'B', status: 'published', metadata: meta() });

  await writer.upsert('timetable_versions', { id: demoUuid('timetable-version-1'), tenant_id: tenantId, academic_year: '2026', term_name: 'Term 2', status: 'published' });
  await writer.upsert('timetable_slots', { id: demoUuid('timetable-slot-1'), tenant_id: tenantId, academic_year: '2026', term_name: 'Term 2', class_section_id: String(classIds[0]), subject_id: String(subjectIds[0]), teacher_id: context.teacherUserId, day_of_week: 1, starts_at: '08:00', ends_at: '08:40', room_label: 'Block A Room 1' });
  await writer.upsert('timetable_lessons', { id: demoUuid('timetable-lesson-1'), tenant_id: tenantId, academic_term_id: termId, stream_id: streamIds[0], class_subject_assignment_id: classSubjectId, weekday: 1, period_number: 1, starts_at: '08:00', ends_at: '08:40', room_label: 'Block A Room 1', metadata: meta() });

  const libraryCatalog = buildKisumuBoysDemoLibraryCatalog();
  const libraryCopyIds: string[] = [];

  for (const [itemIndex, item] of libraryCatalog.entries()) {
    const catalogItemId = demoUuid(`library-item-${itemIndex + 1}`);
    await writer.upsert('library_catalog_items', {
      id: catalogItemId,
      tenant_id: tenantId,
      title: item.title,
      author: item.author,
      isbn: item.isbn,
      category: item.category,
      status: 'active',
      metadata: meta({ category: item.category }),
    });

    for (const [copyIndex, copy] of item.copies.entries()) {
      const copyId = demoUuid(`library-copy-${itemIndex + 1}-${copyIndex + 1}`);
      libraryCopyIds.push(copyId);
      await writer.upsert('library_copies', {
        id: copyId,
        tenant_id: tenantId,
        catalog_item_id: catalogItemId,
        accession_number: copy.accessionNumber,
        barcode: copy.barcode,
        status: copy.status,
        metadata: meta({ title: item.title, category: item.category }),
      });
    }
  }

  const libraryBorrowerIds = studentIds.map((studentId, index) => demoUuid(`library-borrower-student-${index + 1}`));
  for (const [index, borrowerId] of libraryBorrowerIds.entries()) {
    await writer.upsert('library_borrowers', {
      id: borrowerId,
      tenant_id: tenantId,
      borrower_type: 'student',
      subject_id: studentIds[index],
      scan_code: studentRoster[index]?.admissionNumber,
      status: 'active',
      metadata: meta({ student_name: `${studentRoster[index]?.firstName} ${studentRoster[index]?.lastName}` }),
    });
  }

  for (let index = 0; index < 18; index += 1) {
    await writer.insertOnce('library_circulation_ledger', {
      id: demoUuid(`library-active-loan-${index + 1}`),
      tenant_id: tenantId,
      borrower_id: libraryBorrowerIds[index],
      copy_id: libraryCopyIds[index],
      action: 'borrowed',
      due_at: index < 5 ? '2026-05-28T12:00:00.000Z' : '2026-06-15T12:00:00.000Z',
      metadata: meta({
        slip_number: `KB-LIB-SLIP-${String(index + 1).padStart(3, '0')}`,
        status: index < 5 ? 'overdue' : 'active',
        notice: index < 5 ? `Overdue library book for ${studentRoster[index]?.firstName} ${studentRoster[index]?.lastName}` : 'Active issue',
      }),
    });
  }

  for (let index = 0; index < 8; index += 1) {
    await writer.insertOnce('library_circulation_ledger', {
      id: demoUuid(`library-returned-loan-${index + 1}`),
      tenant_id: tenantId,
      borrower_id: libraryBorrowerIds[index + 18],
      copy_id: libraryCopyIds[index + 18],
      action: 'returned',
      metadata: meta({
        slip_number: `KB-LIB-RETURN-${String(index + 1).padStart(3, '0')}`,
        condition: index % 3 === 0 ? 'minor wear noted' : 'good',
      }),
    });
  }

  for (let index = 0; index < 4; index += 1) {
    await writer.upsert('library_fines', {
      id: demoUuid(`library-fine-${index + 1}`),
      tenant_id: tenantId,
      borrower_id: libraryBorrowerIds[index],
      copy_id: libraryCopyIds[index],
      reason: index === 3 ? 'Damaged book handling fee' : 'Overdue library book fine',
      amount_minor: [15000, 25000, 30000, 50000][index],
      billing_reference: `KB-LIB-FINE-${String(index + 1).padStart(3, '0')}`,
      metadata: meta({ student_id: studentIds[index] }),
    });
  }

  await writer.insertOnce('library_circulation_ledger', { id: demoUuid('library-lost-case-1'), tenant_id: tenantId, borrower_id: libraryBorrowerIds[7], copy_id: libraryCopyIds[16], action: 'lost', metadata: meta({ title: 'Lost book case: KCSE Chemistry Revision', billing_reference: 'KB-LIB-LOST-001' }) });
  await writer.insertOnce('library_circulation_ledger', { id: demoUuid('library-damaged-case-1'), tenant_id: tenantId, borrower_id: libraryBorrowerIds[12], copy_id: libraryCopyIds[28], action: 'damaged', metadata: meta({ title: 'Damaged book case: Top Mark Mathematics Form 4', billing_reference: 'KB-LIB-DMG-001' }) });
  await writer.insertOnce('library_audit_logs', { id: demoUuid('library-audit-issue-1'), tenant_id: tenantId, actor_user_id: context.librarianUserId, action: 'library.demo_books_and_loans_seeded', entity_type: 'library_demo_seed', entity_id: demoUuid('library-demo-summary'), metadata: meta({ catalog_items: libraryCatalog.length, copies: libraryCopyIds.length, active_loans: 18, returned_loans: 8, overdue_loans: 5 }) });

  await writer.upsert('inventory_categories', { id: inventoryCategoryId, tenant_id: tenantId, code: 'KB-DEMO-STATIONERY', name: 'Demo Stationery', status: 'active' });
  await writer.upsert('inventory_suppliers', { id: demoUuid('inventory-supplier-1'), tenant_id: tenantId, supplier_name: 'Kisumu Demo Supplies Ltd', contact_phone: '+254733100001', metadata: meta() });
  await writer.upsert('inventory_items', { id: inventoryItemId, tenant_id: tenantId, category_id: inventoryCategoryId, item_name: 'A4 Exercise Books', sku: 'KB-DEMO-EXB', unit: 'pieces', reorder_level: 500, status: 'active' });
  await writer.upsert('inventory_locations', { id: inventoryLocationId, tenant_id: tenantId, code: 'MAIN', name: 'Main Store', status: 'active' });
  await writer.upsert('inventory_item_balances', { id: demoUuid('inventory-balance-1'), tenant_id: tenantId, item_id: inventoryItemId, location_code: 'MAIN', quantity_on_hand: 1200, quantity_reserved: 120 });
  await writer.upsert('inventory_stock_movements', { id: demoUuid('inventory-movement-1'), tenant_id: tenantId, item_id: inventoryItemId, movement_type: 'receipt', quantity: 1200, unit_cost_minor: 2500, reference: 'KB-DEMO-GRN-001' });
  await writer.upsert('inventory_purchase_orders', { id: demoUuid('inventory-po-1'), tenant_id: tenantId, po_number: 'KB-INV-PO-001', supplier_name: 'Kisumu Demo Supplies Ltd', status: 'approved' });
  await writer.upsert('inventory_requests', { id: demoUuid('inventory-request-1'), tenant_id: tenantId, request_number: 'KB-INV-REQ-001', department: 'Mathematics', requested_by: 'Shiro Wanjiru', status: 'pending' });

  await writer.upsert('transport_routes', { id: transportRouteId, tenant_id: tenantId, name: 'Mamboleo Route', code: 'KB-TR-MAMB', status: 'active' });
  await writer.upsert('transport_route_stops', { id: transportStopId, tenant_id: tenantId, route_id: transportRouteId, name: 'Kondele Stage', stop_sequence: 1, pickup_time: '06:30' });
  await writer.upsert('transport_vehicles', { id: transportVehicleId, tenant_id: tenantId, registration_number: 'KCB 123D', capacity: 51, ownership_type: 'school_owned', status: 'active' });
  await writer.upsert('transport_drivers', { id: transportDriverId, tenant_id: tenantId, name: 'John Owino', phone_number: '+254744100001', status: 'active' });
  await writer.upsert('transport_manifests', { id: transportManifestId, tenant_id: tenantId, route_id: transportRouteId, effective_from: '2026-05-04', status: 'active' });
  await writer.upsert('transport_manifest_students', { id: demoUuid('transport-manifest-student-1'), tenant_id: tenantId, manifest_id: transportManifestId, student_id: studentIds[0], pickup_stop_id: transportStopId, dropoff_stop_id: transportStopId, boarding_status: 'active' });
  await writer.upsert('transport_trips', { id: transportTripId, tenant_id: tenantId, route_id: transportRouteId, vehicle_id: transportVehicleId, driver_id: transportDriverId, trip_date: '2026-05-24', direction: 'morning', status: 'completed' });
  await writer.upsert('transport_trip_events', { id: demoUuid('transport-trip-event-1'), tenant_id: tenantId, trip_id: transportTripId, event_type: 'departed', event_time: '2026-05-24T03:30:00.000Z', metadata: meta() });
  await writer.upsert('transport_alerts', { id: demoUuid('transport-alert-1'), tenant_id: tenantId, title: 'Bus service due', message: 'Demo bus service log due next week.', severity: 'warning', metadata: meta() });

  await writer.upsert('procurement_suppliers', { id: procurementSupplierId, tenant_id: tenantId, name: 'Lake Demo Traders', contact_phone: '+254755100001', status: 'active' });
  await writer.upsert('procurement_requests', { id: procurementRequestId, tenant_id: tenantId, title: 'Chemistry reagents restock', department: 'Science', requested_by_user_id: context.teacherUserId, status: 'submitted' });
  await writer.upsert('procurement_request_items', { id: demoUuid('procurement-request-item-1'), tenant_id: tenantId, request_id: procurementRequestId, item_name: 'Chemistry reagent set', quantity: 5, estimated_unit_cost_minor: 250000 });
  await writer.upsert('procurement_approvals', { id: demoUuid('procurement-approval-1'), tenant_id: tenantId, request_id: procurementRequestId, decision: 'approved', approver_user_id: context.actorUserId });
  await writer.upsert('purchase_orders', { id: purchaseOrderId, tenant_id: tenantId, po_number: 'KB-PO-DEMO-001', supplier_id: procurementSupplierId, created_by_user_id: context.actorUserId, status: 'issued' });
  await writer.upsert('purchase_order_items', { id: demoUuid('purchase-order-item-1'), tenant_id: tenantId, purchase_order_id: purchaseOrderId, item_name: 'Exercise books', quantity: 600, unit_cost_minor: 2500 });
  await writer.upsert('supplier_invoices', { id: demoUuid('supplier-invoice-1'), tenant_id: tenantId, purchase_order_id: purchaseOrderId, invoice_number: 'SUP-KB-DEMO-001', amount_minor: 1500000, attached_by_user_id: context.actorUserId, status: 'attached' });

  await writer.upsert('clinic_locations', { id: clinicLocationId, tenant_id: tenantId, name: 'Main Sick Bay', location_type: 'clinic', status: 'active' });
  await writer.upsert('clinic_medicines', { id: clinicMedicineId, tenant_id: tenantId, clinic_location_id: clinicLocationId, medicine_name: 'Paracetamol', category: 'analgesic', unit_type: 'tablets', reorder_level: 100, status: 'active' });
  await writer.upsert('clinic_medicine_batches', { id: clinicBatchId, tenant_id: tenantId, medicine_id: clinicMedicineId, batch_number: 'PCM-KB-DEMO-001', expiry_date: '2027-02-28', quantity_received: 500, quantity_available: 430 });
  await writer.upsert('clinic_visits', { id: clinicVisitId, tenant_id: tenantId, clinic_location_id: clinicLocationId, student_id: studentIds[0], recorded_by_user_id: context.actorUserId, visit_reason: 'Headache', status: 'completed' });
  await writer.upsert('clinic_medicine_dispenses', { id: demoUuid('clinic-dispense-1'), tenant_id: tenantId, visit_id: clinicVisitId, medicine_id: clinicMedicineId, batch_id: clinicBatchId, quantity_dispensed: 2, dosage: 'One tablet twice daily', dispensed_by_user_id: context.actorUserId });
  await writer.upsert('clinic_alerts', { id: demoUuid('clinic-alert-1'), tenant_id: tenantId, alert_type: 'low_stock', severity: 'warning', title: 'Oral rehydration salts low', message: 'Demo clinic stock threshold reached.', metadata: meta() });

  await writer.upsert('lab_departments', { id: labDepartmentId, tenant_id: tenantId, name: 'Science Department', type: 'SCIENCE', status: 'active' });
  await writer.upsert('labs', { id: labId, tenant_id: tenantId, department_id: labDepartmentId, name: 'Chemistry Lab 1', capacity: 40, status: 'active' });
  await writer.upsert('lab_sessions', { id: labSessionId, tenant_id: tenantId, lab_id: labId, class_section_id: classIds[0], subject_name: 'Chemistry', session_date: '2026-05-24', start_time: '10:00', end_time: '11:20', teacher_id: context.teacherUserId, status: 'scheduled' });
  await writer.upsert('lab_equipment', { id: labEquipmentId, tenant_id: tenantId, department_id: labDepartmentId, lab_id: labId, name: 'Compound Microscope', asset_tag: 'KB-LAB-MIC-001', quantity_total: 20, quantity_available: 18, status: 'active' });
  await writer.upsert('chemical_items', { id: chemicalId, tenant_id: tenantId, lab_id: labId, name: 'Ethanol', hazard_class: 'flammable', batch_number: 'ETH-KB-DEMO-001', quantity_total: 10, quantity_available: 7, expiry_date: '2027-01-31' });
  await writer.upsert('chemical_disposal_requests', { id: demoUuid('chemical-disposal-1'), tenant_id: tenantId, chemical_id: chemicalId, requested_by: context.teacherUserId, reason: 'Expired demo indicator sample', status: 'pending' });

  await writer.upsert('offense_categories', { id: offenseCategoryId, tenant_id: tenantId, school_id: context.tenant.id, code: 'KB-LATE', name: 'Late reporting', severity: 'minor', status: 'active' });
  await writer.upsert('discipline_incidents', { id: disciplineIncidentId, tenant_id: tenantId, school_id: context.tenant.id, student_id: studentIds[0], class_id: classIds[0], academic_term_id: termId, academic_year_id: yearId, offense_category_id: offenseCategoryId, reporting_staff_id: context.teacherUserId, incident_number: 'KB-DISC-DEMO-001', title: 'Late after lunch break', severity: 'low', occurred_at: '2026-05-24T10:45:00.000Z', description: 'Demo incident for principal dashboard.', status: 'reported', metadata: meta() });
  await writer.upsert('discipline_actions', { id: demoUuid('discipline-action-1'), tenant_id: tenantId, school_id: context.tenant.id, incident_id: disciplineIncidentId, student_id: studentIds[0], action_type: 'verbal_warning', title: 'Guidance warning', status: 'assigned', metadata: meta() });
  await writer.upsert('commendations', { id: demoUuid('commendation-1'), tenant_id: tenantId, school_id: context.tenant.id, student_id: studentIds[1], class_id: classIds[0], academic_term_id: termId, academic_year_id: yearId, title: 'Helped in lab setup', description: 'Positive conduct demo.', points_delta: 5, metadata: meta() });
  await writer.upsert('counselling_referrals', { id: demoUuid('counselling-referral-1'), tenant_id: tenantId, school_id: context.tenant.id, student_id: studentIds[2], class_id: classIds[1], academic_term_id: termId, academic_year_id: yearId, referred_by_user_id: context.teacherUserId, reason: 'Academic stress check-in', status: 'open' });
  await writer.upsert('counselling_sessions', { id: demoUuid('counselling-session-1'), tenant_id: tenantId, school_id: context.tenant.id, student_id: studentIds[2], counsellor_user_id: context.actorUserId, scheduled_for: '2026-05-27T08:00:00.000Z', status: 'scheduled' });
  await writer.upsert('behavior_points', { id: demoUuid('behavior-points-1'), tenant_id: tenantId, school_id: context.tenant.id, student_id: studentIds[1], class_id: classIds[0], academic_term_id: termId, academic_year_id: yearId, source_type: 'commendation', source_id: demoUuid('commendation-1'), points_delta: 5, reason: 'Demo positive conduct', metadata: meta() });

  await writer.upsert('boarding_students', { id: demoUuid('boarding-student-1'), tenant_id: tenantId, student_id: studentIds[0], dormitory: 'Victoria House', bed_label: 'V-12', status: 'active' });
  await writer.upsert('boarding_meals', { id: demoUuid('boarding-meal-1'), tenant_id: tenantId, meal_type: 'supper', served_on: '2026-05-24', expected_count: 840, served_count: 826, status: 'served' });
  await writer.upsert('boarding_dormitory_checks', { id: demoUuid('boarding-check-1'), tenant_id: tenantId, dormitory: 'Victoria House', checked_at: '2026-05-24T18:30:00.000Z', status: 'clear' });
  await writer.upsert('boarding_incidents', { id: demoUuid('boarding-incident-1'), tenant_id: tenantId, title: 'Broken window latch', dormitory: 'Victoria House', severity: 'low', status: 'open' });
  await writer.upsert('hostel_rooms', { id: hostelRoomId, tenant_id: tenantId, room_name: 'A1', capacity: 8, status: 'active' });
  await writer.upsert('hostel_allocations', { id: demoUuid('hostel-allocation-1'), tenant_id: tenantId, student_id: studentIds[0], room_id: hostelRoomId, bed_label: 'A1-04', status: 'active' });
  await writer.upsert('hostel_issues', { id: demoUuid('hostel-issue-1'), tenant_id: tenantId, title: 'Locker repair', room_id: hostelRoomId, priority: 'medium', status: 'open' });
  await writer.upsert('hostel_meal_consumption', { id: demoUuid('hostel-meal-1'), tenant_id: tenantId, meal_type: 'breakfast', served_on: '2026-05-24', count_served: 820, status: 'served' });

  await writer.upsert('cbt_questions', { id: cbtQuestionId, tenant_id: tenantId, question_text: 'Solve for x: 2x + 5 = 17', subject_code: 'MAT', difficulty: 'easy', metadata: meta() });
  await writer.upsert('cbt_attempts', { id: cbtAttemptId, tenant_id: tenantId, student_id: studentIds[0], assessment_id: examAssessmentId, status: 'submitted', score: 86 });
  await writer.upsert('cbt_responses', { id: demoUuid('cbt-response-1'), tenant_id: tenantId, attempt_id: cbtAttemptId, question_id: cbtQuestionId, response_value: '6', is_correct: true });
  await writer.upsert('cbt_invigilation_events', { id: demoUuid('cbt-event-1'), tenant_id: tenantId, event_type: 'focus_restored', student_id: studentIds[0], metadata: meta() });
  await writer.upsert('lms_content_items', { id: lmsContentId, tenant_id: tenantId, title: 'Quadratic Equations Revision', content_type: 'lesson', subject_code: 'MAT', published: true, metadata: meta() });
  await writer.upsert('lms_assignments', { id: lmsAssignmentId, tenant_id: tenantId, title: 'Algebra practice', content_item_id: lmsContentId, due_at: '2026-06-01T12:00:00.000Z', metadata: meta() });
  await writer.upsert('lms_submissions', { id: demoUuid('lms-submission-1'), tenant_id: tenantId, assignment_id: lmsAssignmentId, student_id: studentIds[0], status: 'submitted', score: 78 });
  await writer.upsert('lms_activity_events', { id: demoUuid('lms-activity-1'), tenant_id: tenantId, event_type: 'content_viewed', student_id: studentIds[0], content_item_id: lmsContentId, metadata: meta() });

  await writer.upsert('ai_insight_alerts', { id: demoUuid('ai-alert-1'), tenant_id: tenantId, title: 'Fee default risk improving', severity: 'info', status: 'open' });
  await writer.upsert('ai_forecasts', { id: demoUuid('ai-forecast-1'), tenant_id: tenantId, forecast_type: 'fee_collection', value: 83, confidence_score: 0.86, status: 'active' });
  await writer.upsert('ai_anomalies', { id: demoUuid('ai-anomaly-1'), tenant_id: tenantId, anomaly_type: 'attendance_drop', severity: 'warning', status: 'open' });
  await writer.upsert('ai_recommendations', { id: demoUuid('ai-recommendation-1'), tenant_id: tenantId, title: 'Follow up Form 1 fee arrears', priority: 'medium', status: 'open' });
  await writer.upsert('visitor_appointments', { id: visitorAppointmentId, tenant_id: tenantId, visitor_name: 'County Education Officer', appointment_at: '2026-05-28T07:00:00.000Z', purpose: 'Demo inspection', status: 'scheduled' });
  await writer.upsert('visitor_badges', { id: visitorBadgeId, tenant_id: tenantId, badge_number: 'KB-VIS-DEMO-001', visitor_appointment_id: visitorAppointmentId, status: 'issued' });
  await writer.upsert('visitor_emergency_logs', { id: demoUuid('visitor-emergency-1'), tenant_id: tenantId, event_type: 'drill', summary: 'Visitor evacuation demo drill', status: 'closed' });
  await writer.upsert('asset_assignments', { id: demoUuid('asset-assignment-1'), tenant_id: tenantId, asset_tag: 'KB-ASSET-PROJ-001', assigned_to_type: 'department', assigned_to_label: 'Science Department', status: 'active' });
  await writer.upsert('asset_repairs', { id: demoUuid('asset-repair-1'), tenant_id: tenantId, asset_tag: 'KB-ASSET-PROJ-001', issue_title: 'Projector lamp replacement', status: 'open' });
  await writer.upsert('asset_depreciation_entries', { id: demoUuid('asset-depreciation-1'), tenant_id: tenantId, asset_tag: 'KB-ASSET-PROJ-001', depreciation_month: '2026-05-01', amount_minor: 45000 });

  await writer.upsert('iot_devices', { id: iotDeviceId, tenant_id: tenantId, name: 'Water Tank Sensor', device_type: 'water_level', status: 'online', metadata: meta() });
  await writer.upsert('iot_telemetry_readings', { id: demoUuid('iot-reading-1'), tenant_id: tenantId, device_id: iotDeviceId, metric_name: 'water_level_percent', metric_value: 72, recorded_at: '2026-05-24T08:00:00.000Z', metadata: meta() });
  await writer.upsert('iot_device_commands', { id: demoUuid('iot-command-1'), tenant_id: tenantId, device_id: iotDeviceId, command_type: 'calibrate', status: 'queued' });
  await writer.upsert('iot_alerts', { id: demoUuid('iot-alert-1'), tenant_id: tenantId, title: 'Water level stable', message: 'Demo IoT water tank reading normal.', severity: 'info', metadata: meta() });

  await writer.upsert('school_sms_wallets', { id: demoUuid('sms-wallet-1'), tenant_id: tenantId, sms_balance: 2500, monthly_used: 120, allow_negative_balance: false });
  await writer.upsert('sms_logs', { id: demoUuid('sms-log-1'), tenant_id: tenantId, recipient_ciphertext: 'demo-redacted', recipient_hash: 'kb-demo-recipient', status: 'delivered', message_body: 'Kisumu Boys demo SMS notice' });
  await writer.upsert('school_integrations', { id: demoUuid('school-integration-sms'), tenant_id: tenantId, integration_type: 'mpesa_daraja', environment: 'sandbox', provider_name: 'SMS relay demo', status: 'configured' });
  await writer.upsert('integration_logs', { id: demoUuid('integration-log-1'), tenant_id: tenantId, integration_type: 'mpesa_daraja', operation: 'send_notice', status: 'success' });

  await writer.upsert('support_categories', { id: supportCategoryId, tenant_id: tenantId, code: 'KB-DEMO-OPS', name: 'Demo operations', description: 'Kisumu Boys demo support category', status: 'active' });
  await writer.upsert('support_tickets', { id: supportTicketId, tenant_id: tenantId, ticket_number: 'KB-SUP-DEMO-001', subject: 'Demo timetable assistance', category: 'KB-DEMO-OPS', priority: 'Medium', module_affected: 'timetable', description: 'Demo support ticket for Kisumu Boys.', first_response_due_at: '2026-05-25T08:00:00.000Z', resolution_due_at: '2026-05-27T08:00:00.000Z', status: 'Open' });
  await writer.upsert('support_messages', { id: demoUuid('support-message-1'), tenant_id: tenantId, ticket_id: supportTicketId, author_user_id: context.actorUserId, author_type: 'school', body: 'Please verify the demo timetable setup.' });
  await writer.upsert('support_kb_articles', { id: demoUuid('support-kb-1'), tenant_id: tenantId, category: 'getting-started', slug: 'kisumu-boys-demo-guide', title: 'Kisumu Boys demo guide', summary: 'How to explore the demo tenant.', body: 'Use this demo tenant to review enabled module workflows.', status: 'published' });
  await writer.upsert('support_system_components', { id: demoUuid('support-component-1'), tenant_id: tenantId, name: 'Kisumu Boys Demo Workspace', slug: 'kisumu-boys-demo-workspace', status: 'operational', metadata: meta() });
  await writer.upsert('support_incidents', { id: demoUuid('support-incident-1'), tenant_id: tenantId, component_id: demoUuid('support-component-1'), title: 'Demo status update', impact: 'minor', update_summary: 'Demo workspace operating normally.', status: 'resolved' });

  await writer.upsert('admin_incidents', { id: demoUuid('admin-incident-1'), tenant_id: tenantId, title: 'Assembly crowding drill', description: 'Demo leadership incident for command center.', severity: 'medium', created_by: context.actorUserId, status: 'reported' });
  await writer.upsert('announcements', { id: demoUuid('announcement-1'), tenant_id: tenantId, title: 'Demo parents meeting', body: 'Kisumu Boys demo announcement.', channels: ['in_app', 'sms'], created_by: context.actorUserId });
  await writer.upsert('meeting_minutes', { id: demoUuid('meeting-minutes-1'), tenant_id: tenantId, meeting_date: '2026-05-22', title: 'Demo BOM meeting', minutes: 'Reviewed module readiness and demo data.', created_by: context.actorUserId });
  await writer.upsert('duty_rosters', { id: demoUuid('duty-roster-1'), tenant_id: tenantId, duty_type: 'morning', duty_date: '2026-05-24', start_time: '06:30', end_time: '07:30', assigned_user_id: context.teacherUserId, status: 'scheduled' });
  await writer.upsert('principal_alerts', { id: demoUuid('principal-alert-1'), tenant_id: tenantId, module_code: 'finance', severity: 'warning', title: 'Fee arrears follow-up', message: 'Demo principal alert: 2 Form 1 accounts need follow-up.', status: 'open', metadata: meta() });
  await writer.upsert('report_snapshots', { id: demoUuid('report-snapshot-1'), tenant_id: tenantId, snapshot_id: 'KB-DEMO-REPORT-001', module: 'finance', report_id: 'fee-summary', title: 'Kisumu Boys Fee Summary Demo', format: 'pdf', artifact: { object_key: 'demo/kisumu-boys/fee-summary.pdf' }, manifest: { seed_key: KISUMU_BOYS_DEMO_SEED_KEY }, manifest_checksum_sha256: createHash('sha256').update('kb-demo-report').digest('hex') });
  await writer.upsert('dashboard_summary_snapshots', { id: demoUuid('dashboard-summary-1'), tenant_id: tenantId, module: 'principal_dashboard', summary_id: 'KB-DEMO-EXECUTIVE', role: 'principal', metrics: { students: studentRoster.length, guardians: guardianIds.length, teachers: 2, invoices: invoiceIds.length, classes: classDefinitions.length }, checksum_sha256: createHash('sha256').update('kb-demo-dashboard').digest('hex') });
  await writer.upsert('consent_records', { id: demoUuid('consent-record-1'), tenant_id: tenantId, consent_type: 'parent_portal', status: 'granted', policy_version: '2026.1', student_id: studentIds[0], guardian_id: guardianIds[0], metadata: meta() });
  await writer.upsert('data_subject_requests', { id: demoUuid('data-subject-request-1'), tenant_id: tenantId, request_type: 'access_request', status: 'submitted', due_at: '2026-06-20T12:00:00.000Z', requester_name: 'Guardian Otieno' });
}

async function runSeed(apply: boolean): Promise<SeedSummary> {
  if (apply && !process.argv.includes('--confirm-kisumu-boys-only')) {
    throw new Error('Refusing to mutate data without --confirm-kisumu-boys-only.');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const tenant = await resolveTenant(client);
    const users = await resolveUsers(client, tenant.tenant_id);
    const billingSubscriptionId = await resolveActiveSubscriptionId(client, tenant.tenant_id);
    const writer = new DemoSeedWriter(client, tenant, !apply);
    await writer.loadSchema();
    writer.setExistingUsersByRole(users.existingUsersByRole);

    if (!apply) {
      await writer.countTaggedDemoRowsOutsideTarget();
      return writer.result;
    }

    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenant.tenant_id]);
    await writer.enableAllModules(users.actorUserId);
    await seedDemoRows(writer, {
      tenant,
      ...users,
      billingSubscriptionId,
      now: new Date(),
    });
    const outsideRows = await writer.countTaggedDemoRowsOutsideTarget();

    if (outsideRows !== 0) {
      throw new Error(`Found ${outsideRows} tagged demo rows outside Kisumu Boys. Rolling back.`);
    }

    await client.query('COMMIT');
    return writer.result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors when no transaction has started.
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const plan = buildKisumuBoysDemoSeedPlan();

  if (!apply) {
    process.stdout.write(`${JSON.stringify({ plan, dryRun: await runSeed(false) }, null, 2)}\n`);
    return;
  }

  const summary = await runSeed(true);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
