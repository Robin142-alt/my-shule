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

type DemoMedicineCatalogItem = {
  name: string;
  category: string;
  unitType: 'tablets' | 'bottles' | 'sachets' | 'units';
  reorderLevel: number;
  quantityReceived: number;
  quantityAvailable: number;
  expiryDate: string;
  lowStock?: boolean;
};

type DemoInventoryCatalogItem = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  kind: 'consumable' | 'asset';
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  location: string;
  department?: string;
  status?: 'active' | 'damaged' | 'maintenance';
};

type DemoTransportRoute = {
  name: string;
  code: string;
  zone: string;
  fareAmountMinor: number;
  stops: Array<{
    name: string;
    plannedTime: string;
  }>;
};

type DemoBoardingHouse = {
  name: string;
  capacity: number;
  present: number;
  missing: number;
  issue?: string;
};

type DemoVisitorRecord = {
  name: string;
  phoneOrId: string;
  visiting: string;
  reason: string;
  status: 'inside' | 'waiting' | 'exited' | 'overstayed';
  priority: 'normal' | 'high' | 'critical';
};

type DemoFinanceEvents = {
  payments: Array<{
    studentIndex: number;
    method: 'cash' | 'bank_deposit' | 'mpesa_c2b';
    amountMinor: number;
    receipt: string;
    status: 'received' | 'cleared';
  }>;
  mpesa: Array<{
    studentIndex: number;
    transId: string;
    amountMinor: number;
    status: 'verified_matched' | 'manual_review_required' | 'received_unverified';
  }>;
};

type DemoOperationalNotification = {
  key: string;
  type: string;
  title: string;
  body: string;
  audienceRoles: string[];
  priority: 'normal' | 'important' | 'urgent';
  targetGuardianIndex?: number;
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
  { moduleCode: 'inventory', table: 'inventory_stock_count_snapshots', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_stock_movements', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_purchase_orders', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_requests', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_reservations', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_request_backorders', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_transfers', tenantScoped: true },
  { moduleCode: 'inventory', table: 'inventory_incidents', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_routes', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_route_stops', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_vehicles', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_drivers', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_manifests', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_manifest_students', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_trips', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_trip_events', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_alerts', tenantScoped: true },
  { moduleCode: 'transport', table: 'vehicle_service_logs', tenantScoped: true },
  { moduleCode: 'transport', table: 'transport_audit_logs', tenantScoped: true },
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
  { moduleCode: 'clinic_health', table: 'clinic_stock_movements', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_visits', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_medicine_dispenses', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_procurement_recommendations', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_alerts', tenantScoped: true },
  { moduleCode: 'clinic_health', table: 'clinic_audit_logs', tenantScoped: true },
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
  { moduleCode: 'communication_sms', table: 'notifications', tenantScoped: true },
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

export function buildKisumuBoysDemoMedicineCatalog(): DemoMedicineCatalogItem[] {
  return [
    { name: 'Paracetamol', category: 'analgesic', unitType: 'tablets', reorderLevel: 100, quantityReceived: 500, quantityAvailable: 430, expiryDate: '2027-02-28' },
    { name: 'ORS', category: 'rehydration', unitType: 'sachets', reorderLevel: 80, quantityReceived: 200, quantityAvailable: 45, expiryDate: '2027-04-30', lowStock: true },
    { name: 'Antacid', category: 'digestive', unitType: 'tablets', reorderLevel: 70, quantityReceived: 180, quantityAvailable: 62, expiryDate: '2027-03-31', lowStock: true },
    { name: 'Bandages', category: 'first_aid', unitType: 'units', reorderLevel: 60, quantityReceived: 300, quantityAvailable: 188, expiryDate: '2028-01-31' },
    { name: 'Antiseptic', category: 'first_aid', unitType: 'bottles', reorderLevel: 20, quantityReceived: 60, quantityAvailable: 24, expiryDate: '2027-06-30' },
    { name: 'Thermometer covers', category: 'diagnostic', unitType: 'units', reorderLevel: 150, quantityReceived: 400, quantityAvailable: 310, expiryDate: '2028-08-31' },
    { name: 'Gloves', category: 'protective', unitType: 'units', reorderLevel: 200, quantityReceived: 800, quantityAvailable: 520, expiryDate: '2028-03-31' },
  ];
}

export function buildKisumuBoysDemoInventoryCatalog(): DemoInventoryCatalogItem[] {
  return [
    { name: 'Whiteboard markers', sku: 'KB-STORE-MKR', category: 'Stationery', unit: 'boxes', kind: 'consumable', quantity: 48, reorderLevel: 20, unitCost: 850, location: 'Main Store', department: 'Academics' },
    { name: 'Chalk cartons', sku: 'KB-STORE-CHK', category: 'Stationery', unit: 'cartons', kind: 'consumable', quantity: 35, reorderLevel: 15, unitCost: 1200, location: 'Main Store', department: 'Academics' },
    { name: 'A4 exercise books', sku: 'KB-STORE-EXB', category: 'Stationery', unit: 'pieces', kind: 'consumable', quantity: 1200, reorderLevel: 500, unitCost: 25, location: 'Main Store', department: 'Academics' },
    { name: 'Printer paper reams', sku: 'KB-STORE-PPR', category: 'Office Supplies', unit: 'reams', kind: 'consumable', quantity: 86, reorderLevel: 40, unitCost: 620, location: 'Admin Store', department: 'Secretary' },
    { name: 'Toner cartridges', sku: 'KB-STORE-TNR', category: 'Office Supplies', unit: 'pieces', kind: 'consumable', quantity: 8, reorderLevel: 6, unitCost: 7800, location: 'Admin Store', department: 'Secretary' },
    { name: 'Cleaning detergent', sku: 'KB-STORE-DET', category: 'Cleaning Supplies', unit: 'litres', kind: 'consumable', quantity: 140, reorderLevel: 50, unitCost: 180, location: 'Main Store', department: 'Boarding' },
    { name: 'Brooms', sku: 'KB-STORE-BRM', category: 'Cleaning Supplies', unit: 'pieces', kind: 'consumable', quantity: 64, reorderLevel: 25, unitCost: 220, location: 'Main Store', department: 'Boarding' },
    { name: 'Disinfectant', sku: 'KB-STORE-DIS', category: 'Cleaning Supplies', unit: 'litres', kind: 'consumable', quantity: 38, reorderLevel: 20, unitCost: 350, location: 'Main Store', department: 'Clinic' },
    { name: 'Lab gloves', sku: 'KB-STORE-LGL', category: 'Laboratory', unit: 'boxes', kind: 'consumable', quantity: 16, reorderLevel: 12, unitCost: 950, location: 'Science Store', department: 'Science' },
    { name: 'Laboratory goggles', sku: 'KB-STORE-GOG', category: 'Laboratory', unit: 'pieces', kind: 'consumable', quantity: 72, reorderLevel: 30, unitCost: 450, location: 'Science Store', department: 'Science' },
    { name: 'First aid refill packs', sku: 'KB-STORE-FAR', category: 'Clinic Supplies', unit: 'packs', kind: 'consumable', quantity: 10, reorderLevel: 8, unitCost: 2500, location: 'Clinic Store', department: 'Clinic' },
    { name: 'Mattresses', sku: 'KB-STORE-MAT', category: 'Boarding Supplies', unit: 'pieces', kind: 'consumable', quantity: 28, reorderLevel: 15, unitCost: 4200, location: 'Hostel Store', department: 'Boarding' },
    { name: 'Football balls', sku: 'KB-STORE-FBL', category: 'Sports', unit: 'pieces', kind: 'consumable', quantity: 18, reorderLevel: 8, unitCost: 1800, location: 'Sports Store', department: 'Games' },
    { name: 'Office files', sku: 'KB-STORE-FIL', category: 'Office Supplies', unit: 'pieces', kind: 'consumable', quantity: 210, reorderLevel: 80, unitCost: 75, location: 'Admin Store', department: 'Secretary' },
    { name: 'Food storage sacks', sku: 'KB-STORE-SCK', category: 'Kitchen Supplies', unit: 'pieces', kind: 'consumable', quantity: 90, reorderLevel: 30, unitCost: 160, location: 'Kitchen Store', department: 'Kitchen' },
    { name: 'Projector Epson EB-X49', sku: 'KB-ASSET-PRJ-001', category: 'ICT Assets', unit: 'piece', kind: 'asset', quantity: 3, reorderLevel: 1, unitCost: 98000, location: 'ICT Store', department: 'ICT' },
    { name: 'HP laptops', sku: 'KB-ASSET-LAP-001', category: 'ICT Assets', unit: 'piece', kind: 'asset', quantity: 14, reorderLevel: 2, unitCost: 65000, location: 'Computer Lab', department: 'ICT' },
    { name: 'Laser printers', sku: 'KB-ASSET-PRN-001', category: 'ICT Assets', unit: 'piece', kind: 'asset', quantity: 4, reorderLevel: 1, unitCost: 42000, location: 'Admin Block', department: 'Secretary' },
    { name: 'Dormitory metal beds', sku: 'KB-ASSET-BED-001', category: 'Boarding Assets', unit: 'piece', kind: 'asset', quantity: 60, reorderLevel: 5, unitCost: 7500, location: 'Victoria House', department: 'Boarding' },
    { name: 'Security CCTV cameras', sku: 'KB-ASSET-CCTV-001', category: 'Security Assets', unit: 'piece', kind: 'asset', quantity: 16, reorderLevel: 2, unitCost: 12500, location: 'Security Office', department: 'Security', status: 'maintenance' },
  ];
}

export function buildKisumuBoysDemoTransportRoutes(): DemoTransportRoute[] {
  return [
    { name: 'Milimani Route', code: 'KB-TR-MIL', zone: 'Milimani', fareAmountMinor: 850000, stops: [{ name: 'Milimani Estate', plannedTime: '06:05' }, { name: 'Mega City', plannedTime: '06:20' }, { name: 'School Gate', plannedTime: '06:45' }] },
    { name: 'Mamboleo Route', code: 'KB-TR-MAMB', zone: 'Mamboleo', fareAmountMinor: 900000, stops: [{ name: 'Mamboleo Junction', plannedTime: '06:00' }, { name: 'Kondele Stage', plannedTime: '06:30' }, { name: 'School Gate', plannedTime: '06:50' }] },
    { name: 'Manyatta Route', code: 'KB-TR-MAN', zone: 'Manyatta', fareAmountMinor: 750000, stops: [{ name: 'Manyatta Market', plannedTime: '06:15' }, { name: 'Kibuye Stage', plannedTime: '06:35' }, { name: 'School Gate', plannedTime: '06:55' }] },
    { name: 'Kisian Route', code: 'KB-TR-KIS', zone: 'Kisian', fareAmountMinor: 1100000, stops: [{ name: 'Kisian Junction', plannedTime: '05:55' }, { name: 'Dunga Stage', plannedTime: '06:25' }, { name: 'School Gate', plannedTime: '06:50' }] },
    { name: 'Nyamasaria Route', code: 'KB-TR-NYA', zone: 'Nyamasaria', fareAmountMinor: 950000, stops: [{ name: 'Nyamasaria Stage', plannedTime: '06:10' }, { name: 'Nyalenda Junction', plannedTime: '06:30' }, { name: 'School Gate', plannedTime: '06:55' }] },
    { name: 'Riat Route', code: 'KB-TR-RIAT', zone: 'Riat', fareAmountMinor: 1000000, stops: [{ name: 'Riat Hills', plannedTime: '06:05' }, { name: 'Obunga Stage', plannedTime: '06:35' }, { name: 'School Gate', plannedTime: '06:55' }] },
  ];
}

export function buildKisumuBoysDemoBoardingHouses(): DemoBoardingHouse[] {
  return [
    { name: 'Victoria House', capacity: 220, present: 214, missing: 1, issue: 'One Form 3 boarder late from evening prep' },
    { name: 'Winam House', capacity: 200, present: 198, missing: 0 },
    { name: 'Rusinga House', capacity: 180, present: 176, missing: 2, issue: 'Two exeats waiting for deputy approval' },
    { name: 'Ndere House', capacity: 160, present: 158, missing: 0 },
  ];
}

export function buildKisumuBoysDemoVisitors(): DemoVisitorRecord[] {
  return [
    { name: 'Mrs Grace Onyango', phoneOrId: 'ID 23456781', visiting: 'Brian Otieno', reason: 'Fee statement and class teacher meeting', status: 'inside', priority: 'normal' },
    { name: 'Mr Samuel Ouma', phoneOrId: 'ID 24567892', visiting: 'Principal Wanjiku', reason: 'Board meeting preparation', status: 'inside', priority: 'high' },
    { name: 'County Education Officer', phoneOrId: 'GOV-CEB-018', visiting: 'Principal Office', reason: 'Routine school inspection', status: 'inside', priority: 'high' },
    { name: 'Mr Peter Mwangi', phoneOrId: 'ID 25678903', visiting: 'Accounts Office', reason: 'M-Pesa payment confirmation', status: 'waiting', priority: 'normal' },
    { name: 'Mrs Faith Akinyi', phoneOrId: 'ID 26789014', visiting: 'Nurse', reason: 'Medical follow-up', status: 'inside', priority: 'normal' },
    { name: 'Kisumu Demo Supplies Courier', phoneOrId: 'KDS-COURIER-04', visiting: 'Storekeeper', reason: 'Delivery note signing', status: 'inside', priority: 'normal' },
    { name: 'Mr David Kiptoo', phoneOrId: 'ID 27890125', visiting: 'Deputy Principal', reason: 'Discipline follow-up', status: 'overstayed', priority: 'critical' },
    { name: 'St. John Ambulance Trainer', phoneOrId: 'ORG-STJ-001', visiting: 'Nurse', reason: 'First aid club training', status: 'exited', priority: 'normal' },
  ];
}

export function buildKisumuBoysDemoFinanceEvents(): DemoFinanceEvents {
  return {
    payments: [
      { studentIndex: 0, method: 'mpesa_c2b', amountMinor: 3000000, receipt: 'KB-DEMO-RCPT-001', status: 'received' },
      { studentIndex: 3, method: 'cash', amountMinor: 1250000, receipt: 'KB-DEMO-RCPT-002', status: 'received' },
      { studentIndex: 7, method: 'bank_deposit', amountMinor: 4200000, receipt: 'KB-DEMO-RCPT-003', status: 'cleared' },
      { studentIndex: 12, method: 'mpesa_c2b', amountMinor: 1800000, receipt: 'KB-DEMO-RCPT-004', status: 'received' },
      { studentIndex: 18, method: 'cash', amountMinor: 950000, receipt: 'KB-DEMO-RCPT-005', status: 'received' },
      { studentIndex: 24, method: 'mpesa_c2b', amountMinor: 2500000, receipt: 'KB-DEMO-RCPT-006', status: 'received' },
    ],
    mpesa: [
      { studentIndex: 0, transId: 'KBDEMO001', amountMinor: 3000000, status: 'verified_matched' },
      { studentIndex: 12, transId: 'KBDEMO002', amountMinor: 1800000, status: 'verified_matched' },
      { studentIndex: 24, transId: 'KBDEMO003', amountMinor: 2500000, status: 'verified_matched' },
      { studentIndex: 5, transId: 'KBDEMO004', amountMinor: 1200000, status: 'manual_review_required' },
      { studentIndex: 9, transId: 'KBDEMO005', amountMinor: 800000, status: 'received_unverified' },
    ],
  };
}

export function buildKisumuBoysDemoOperationalNotifications(): DemoOperationalNotification[] {
  return [
    { key: 'attendance-missing-registers', type: 'attendance.alert', title: '7 attendance registers missing', body: 'Class teachers should submit pending morning registers before 9:00 AM.', audienceRoles: ['principal', 'deputy_principal', 'class_teacher'], priority: 'urgent' },
    { key: 'fees-arrears-follow-up', type: 'finance.alert', title: '42 students above KSh 10,000 balance', body: 'Accountant has prepared fee reminder SMS for approval.', audienceRoles: ['principal', 'accountant', 'secretary'], priority: 'important' },
    { key: 'clinic-parent-notified', type: 'clinic.notice', title: 'Parent notified after sick bay visit', body: 'Nurse treated a Grade 10 learner and sent parent update.', audienceRoles: ['nurse', 'class_teacher', 'principal'], priority: 'normal', targetGuardianIndex: 0 },
    { key: 'library-overdue-fine', type: 'library.alert', title: 'Overdue library books need follow-up', body: 'Five borrowers have overdue books and fine notices.', audienceRoles: ['librarian', 'class_teacher', 'parent'], priority: 'important', targetGuardianIndex: 1 },
    { key: 'boarding-late-return', type: 'boarding.alert', title: 'Boarding late return recorded', body: 'Victoria House has one late return requiring deputy review.', audienceRoles: ['boarding_master', 'deputy_principal', 'principal'], priority: 'urgent', targetGuardianIndex: 2 },
    { key: 'transport-maintenance', type: 'transport.alert', title: 'Bus service required today', body: 'KDC 448M is marked for maintenance before afternoon route.', audienceRoles: ['transport_manager', 'principal', 'system_monitor'], priority: 'important' },
    { key: 'store-request-approved', type: 'inventory.notice', title: 'Science request approved', body: 'Lab gloves request approved and reserved for collection.', audienceRoles: ['storekeeper', 'teacher', 'hod'], priority: 'normal' },
    { key: 'visitor-overstay', type: 'security.alert', title: 'One visitor overstayed', body: 'Security flagged a visitor waiting for deputy follow-up.', audienceRoles: ['security_officer', 'secretary', 'deputy_principal'], priority: 'urgent' },
    { key: 'admission-onboarding', type: 'admissions.notice', title: 'Accepted applicant needs onboarding', body: 'Secretary and accountant have pending onboarding steps.', audienceRoles: ['admissions_officer', 'secretary', 'accountant'], priority: 'important' },
    { key: 'ict-cctv-fault', type: 'system.alert', title: 'CCTV maintenance ticket open', body: 'Two cameras near back gate are offline and visible in System Monitor.', audienceRoles: ['ict_manager', 'system_monitor', 'principal'], priority: 'important' },
  ];
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

  const financeEvents = buildKisumuBoysDemoFinanceEvents();
  for (const [index, feePayment] of financeEvents.payments.entries()) {
    const manualPaymentId = index === 0 ? paymentId : demoUuid(`manual-payment-${index + 1}`);
    await writer.upsert('manual_fee_payments', {
      id: manualPaymentId,
      tenant_id: tenantId,
      idempotency_key: `KB-DEMO-MANUAL-PAYMENT-${index + 1}`,
      receipt_number: feePayment.receipt,
      invoice_id: invoiceIds[feePayment.studentIndex],
      student_id: studentIds[feePayment.studentIndex],
      payment_method: feePayment.method,
      amount_minor: feePayment.amountMinor,
      received_at: `2026-05-2${index}T09:30:00.000Z`,
      status: feePayment.status,
      payer_name: studentRoster[feePayment.studentIndex]?.guardian.fullName,
      created_by_user_id: context.actorUserId,
      metadata: meta({ student_name: `${studentRoster[feePayment.studentIndex]?.firstName} ${studentRoster[feePayment.studentIndex]?.lastName}` }),
    });
    await writer.upsert('manual_fee_payment_allocations', { id: demoUuid(`manual-payment-allocation-${index + 1}`), tenant_id: tenantId, manual_payment_id: manualPaymentId, invoice_id: invoiceIds[feePayment.studentIndex], student_id: studentIds[feePayment.studentIndex], allocation_type: 'invoice', amount_minor: feePayment.amountMinor, metadata: meta() });
  }

  const billingNotifications = [
    { key: 'KB-DEMO-BILLING-OK', channel: 'email', audience: 'owner', title: 'Billing active for Kisumu Boys demo', body: 'Manual billing state is active.', status: 'sent' },
    { key: 'KB-DEMO-FEE-REMINDER-SMS', channel: 'sms', audience: 'parents', title: 'Fee reminder SMS queued', body: '42 balance reminders are ready for parent SMS delivery.', status: 'queued' },
    { key: 'KB-DEMO-MPESA-FAILED', channel: 'admin', audience: 'accountant', title: 'M-Pesa confirmation needs review', body: 'One M-Pesa callback requires manual review before receipt posting.', status: 'failed' },
  ];
  for (const [index, notice] of billingNotifications.entries()) {
    await writer.upsert('billing_notifications', { id: demoUuid(`billing-notification-${index + 1}`), tenant_id: tenantId, subscription_id: subscriptionId, notification_key: notice.key, channel: notice.channel, audience: notice.audience, lifecycle_state: 'ACTIVE', title: notice.title, body: notice.body, status: notice.status, metadata: meta() });
  }

  await writer.upsert('payment_intents', { id: demoUuid('payment-intent-1'), tenant_id: tenantId, idempotency_key_id: idempotencyId, account_reference: 'KB-DEMO-001', transaction_desc: 'Kisumu Boys demo fee payment', phone_number: '+25471120001', amount_minor: 3000000, status: 'completed', metadata: meta() });
  for (const [index, mpesa] of financeEvents.mpesa.entries()) {
    await writer.upsert('mpesa_c2b_payments', {
      id: demoUuid(`mpesa-c2b-${index + 1}`),
      tenant_id: tenantId,
      trans_id: mpesa.transId,
      transaction_type: 'Pay Bill',
      business_short_code: '123456',
      bill_ref_number: studentRoster[mpesa.studentIndex]?.admissionNumber,
      invoice_number: `KB-DEMO-INV-${String(mpesa.studentIndex + 1).padStart(3, '0')}`,
      amount_minor: mpesa.amountMinor,
      phone_number: studentRoster[mpesa.studentIndex]?.guardian.phone,
      payer_name: studentRoster[mpesa.studentIndex]?.guardian.fullName,
      status: mpesa.status,
      matched_invoice_id: mpesa.status === 'verified_matched' ? invoiceIds[mpesa.studentIndex] : undefined,
      matched_student_id: mpesa.status === 'verified_matched' ? studentIds[mpesa.studentIndex] : undefined,
      manual_fee_payment_id: mpesa.status === 'verified_matched' && index < financeEvents.payments.length ? (index === 0 ? paymentId : demoUuid(`manual-payment-${index + 1}`)) : undefined,
      received_at: `2026-05-2${index}T09:30:00.000Z`,
      matched_at: mpesa.status === 'verified_matched' ? `2026-05-2${index}T09:35:00.000Z` : undefined,
      raw_payload: meta({ demo_provider: 'safaricom_sandbox', trans_id: mpesa.transId }),
      payload_sha256: createHash('sha256').update(`kb-demo-mpesa-${mpesa.transId}`).digest('hex'),
      metadata: meta({ dashboard_status: mpesa.status }),
    });
  }

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

  const inventoryCatalog = buildKisumuBoysDemoInventoryCatalog();
  const inventoryCategoryIds = new Map<string, string>();
  const inventorySupplierId = demoUuid('inventory-supplier-kisumu-demo-supplies');
  const inventoryLocations = [
    { code: 'MAIN', name: 'Main Store' },
    { code: 'ADMIN', name: 'Admin Store' },
    { code: 'SCI', name: 'Science Store' },
    { code: 'CLINIC', name: 'Clinic Store' },
    { code: 'HOSTEL', name: 'Hostel Store' },
    { code: 'ICT', name: 'ICT Store' },
    { code: 'SPORTS', name: 'Sports Store' },
    { code: 'KITCHEN', name: 'Kitchen Store' },
  ];

  await writer.upsert('inventory_suppliers', { id: inventorySupplierId, tenant_id: tenantId, supplier_name: 'Kisumu Demo Supplies Ltd', contact_person: 'Grace Njeri', email: 'supplies@kisumuboys.demo', phone: '+254733100001', county: 'Kisumu', metadata: meta() });

  for (const [index, location] of inventoryLocations.entries()) {
    await writer.upsert('inventory_locations', { id: demoUuid(`inventory-location-${location.code.toLowerCase()}`), tenant_id: tenantId, code: location.code, name: location.name, status: 'active' });
  }

  for (const item of inventoryCatalog) {
    if (!inventoryCategoryIds.has(item.category)) {
      const categoryId = demoUuid(`inventory-category-${item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
      inventoryCategoryIds.set(item.category, categoryId);
      await writer.upsert('inventory_categories', { id: categoryId, tenant_id: tenantId, code: `KB-${item.category.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18)}`, name: item.category, manager: item.department ?? 'Storekeeper', storage_zones: item.location, description: `Kisumu Boys ${item.category.toLowerCase()} demo catalogue` });
    }
  }

  const inventoryItemIds: string[] = [];
  for (const [index, item] of inventoryCatalog.entries()) {
    const itemId = demoUuid(`inventory-item-${item.sku.toLowerCase()}`);
    inventoryItemIds.push(itemId);
    const locationCode = inventoryLocations.find((location) => item.location.toLowerCase().includes(location.name.toLowerCase().split(' ')[0]))?.code ?? 'MAIN';

    await writer.upsert('inventory_items', {
      id: itemId,
      tenant_id: tenantId,
      category_id: inventoryCategoryIds.get(item.category),
      supplier_id: inventorySupplierId,
      item_name: item.name,
      sku: item.sku,
      unit: item.unit,
      quantity_on_hand: item.quantity,
      unit_price: item.unitCost,
      reorder_level: item.reorderLevel,
      storage_location: item.location,
      notes: `${item.kind === 'asset' ? 'High-value traceable asset' : 'Daily school consumable'} for ${item.department ?? 'school operations'}.`,
      status: item.status === 'maintenance' ? 'active' : item.status ?? 'active',
    });
    await writer.upsert('inventory_item_balances', { tenant_id: tenantId, item_id: itemId, location_code: locationCode, quantity_on_hand: item.quantity }, ['tenant_id', 'item_id', 'location_code']);
    await writer.insertOnce('inventory_stock_movements', {
      id: demoUuid(`inventory-receipt-${item.sku.toLowerCase()}`),
      tenant_id: tenantId,
      item_id: itemId,
      movement_type: 'receipt',
      quantity: item.quantity,
      unit_cost: item.unitCost,
      reference: `KB-GRN-${String(index + 1).padStart(3, '0')}`,
      before_quantity: 0,
      after_quantity: item.quantity,
      department: item.department,
      counterparty: 'Kisumu Demo Supplies Ltd',
      actor_user_id: context.actorUserId,
      notes: `Demo opening balance for ${item.name}`,
    });
  }

  await writer.upsert('inventory_purchase_orders', {
    id: demoUuid('inventory-po-1'),
    tenant_id: tenantId,
    po_number: 'KB-INV-PO-001',
    supplier_id: inventorySupplierId,
    status: 'approved',
    expected_delivery_date: '2026-06-07',
    ordered_at: '2026-05-24',
    approved_by_user_id: context.actorUserId,
    total_amount: 248500,
    lines: meta({ items: inventoryCatalog.slice(0, 6).map((item) => ({ sku: item.sku, name: item.name, quantity: Math.min(item.quantity, 20) })) }),
  });

  const inventoryRequests = [
    { department: 'Mathematics', requestedBy: 'Shiro Wanjiru', itemIndex: 0, quantity: 6, status: 'fulfilled', priority: 'normal' },
    { department: 'Boarding', requestedBy: 'Mr Otieno', itemIndex: 5, quantity: 20, status: 'pending', priority: 'high' },
    { department: 'Science', requestedBy: 'Mr Mwangi', itemIndex: 8, quantity: 4, status: 'approved', priority: 'high' },
    { department: 'Clinic', requestedBy: 'Mrs Achieng', itemIndex: 10, quantity: 3, status: 'pending', priority: 'urgent' },
    { department: 'ICT', requestedBy: 'Brian Otieno', itemIndex: 15, quantity: 1, status: 'pending', priority: 'high' },
  ];
  for (const [index, request] of inventoryRequests.entries()) {
    const requestId = demoUuid(`inventory-request-${index + 1}`);
    const requestedItem = inventoryCatalog[request.itemIndex];
    const requestedItemId = inventoryItemIds[request.itemIndex];

    await writer.upsert('inventory_requests', {
      id: requestId,
      tenant_id: tenantId,
      request_number: `KB-INV-REQ-${String(index + 1).padStart(3, '0')}`,
      department: request.department,
      requested_by: request.requestedBy,
      status: request.status,
      needed_by: '2026-06-05',
      priority: request.priority,
      lines: meta({ items: [{ sku: requestedItem?.sku, item: requestedItem?.name, quantity: request.quantity }] }),
      notes: `${request.department} request for active dashboard communication demo.`,
      approved_by_user_id: request.status !== 'pending' ? context.actorUserId : undefined,
    });
    if (request.status === 'approved' || request.status === 'fulfilled') {
      await writer.upsert('inventory_reservations', { id: demoUuid(`inventory-reservation-${index + 1}`), tenant_id: tenantId, request_id: requestId, item_id: requestedItemId, quantity: request.quantity, status: request.status === 'fulfilled' ? 'fulfilled' : 'reserved', reserved_by_user_id: context.actorUserId });
    }
  }
  await writer.upsert('inventory_request_backorders', { id: demoUuid('inventory-backorder-1'), tenant_id: tenantId, request_id: demoUuid('inventory-request-4'), item_id: inventoryItemIds[10], requested_quantity: 12, reserved_quantity: 3, backordered_quantity: 9, status: 'open' });
  await writer.upsert('inventory_transfers', { id: demoUuid('inventory-transfer-1'), tenant_id: tenantId, transfer_number: 'KB-INV-TRF-001', from_location: 'MAIN', to_location: 'HOSTEL', status: 'pending', requested_by: 'Boarding Master', approved_by: 'Principal Wanjiku', lines: meta({ items: [{ item: 'Mattresses', quantity: 8 }] }), notes: 'Dormitory refill waiting for collection.' });
  await writer.upsert('inventory_incidents', { id: demoUuid('inventory-incident-cctv-1'), tenant_id: tenantId, incident_number: 'KB-INV-INC-001', item_id: inventoryItemIds[19], incident_type: 'maintenance', quantity: 2, reason: 'Two CCTV cameras offline near back gate', responsible_department: 'Security', cost_impact: 25000, status: 'logged', notes: 'Visible to Principal, Security, ICT, and System Monitor dashboards.' });
  await writer.upsert('inventory_stock_count_snapshots', { id: demoUuid('inventory-stock-count-1'), tenant_id: tenantId, snapshot_number: 'KB-INV-STK-001', location_code: 'MAIN', counted_by_user_id: context.actorUserId, status: 'posted', variance_count: 3, lines: meta({ counts: inventoryCatalog.slice(0, 10).map((item) => ({ sku: item.sku, expected: item.quantity, counted: item.quantity - (item.reorderLevel > item.quantity ? 1 : 0) })) }), notes: 'Demo stock take snapshot for operational dashboards.' });

  const transportRoutes = buildKisumuBoysDemoTransportRoutes();
  const transportRouteIds: string[] = [];
  const transportStopIds: string[][] = [];
  const transportVehicleIds = [
    demoUuid('transport-vehicle-kcb-123d'),
    demoUuid('transport-vehicle-kdc-448m'),
    demoUuid('transport-vehicle-kde-781n'),
    demoUuid('transport-vehicle-kdh-902p'),
  ];
  const transportDriverIds = [
    demoUuid('transport-driver-john-owino'),
    demoUuid('transport-driver-peter-odede'),
    demoUuid('transport-driver-david-otieno'),
    demoUuid('transport-driver-samuel-ochieng'),
  ];

  const vehicles = [
    { id: transportVehicleIds[0], registration: 'KCB 123D', capacity: 51, status: 'active', serviceDue: '2026-06-10' },
    { id: transportVehicleIds[1], registration: 'KDC 448M', capacity: 51, status: 'maintenance', serviceDue: '2026-06-02' },
    { id: transportVehicleIds[2], registration: 'KDE 781N', capacity: 33, status: 'active', serviceDue: '2026-07-15' },
    { id: transportVehicleIds[3], registration: 'KDH 902P', capacity: 29, status: 'active', serviceDue: '2026-06-28' },
  ];
  const drivers = [
    { id: transportDriverIds[0], name: 'John Owino', phone: '+254744100001', license: 'DL-KB-001' },
    { id: transportDriverIds[1], name: 'Peter Odede', phone: '+254744100002', license: 'DL-KB-002' },
    { id: transportDriverIds[2], name: 'David Otieno', phone: '+254744100003', license: 'DL-KB-003' },
    { id: transportDriverIds[3], name: 'Samuel Ochieng', phone: '+254744100004', license: 'DL-KB-004' },
  ];

  for (const vehicle of vehicles) {
    await writer.upsert('transport_vehicles', { id: vehicle.id, tenant_id: tenantId, registration_number: vehicle.registration, capacity: vehicle.capacity, ownership_type: 'school_owned', make: 'Isuzu', model: 'NQR School Bus', service_due_date: vehicle.serviceDue, insurance_expiry_date: '2027-01-31', status: vehicle.status, created_by_user_id: context.actorUserId });
  }
  for (const driver of drivers) {
    await writer.upsert('transport_drivers', { id: driver.id, tenant_id: tenantId, name: driver.name, phone: driver.phone, license_number: driver.license, license_expiry_date: '2027-08-31', status: 'active', created_by_user_id: context.actorUserId });
  }

  for (const [routeIndex, route] of transportRoutes.entries()) {
    const routeId = demoUuid(`transport-route-${route.code.toLowerCase()}`);
    const manifestId = demoUuid(`transport-manifest-${route.code.toLowerCase()}`);
    const tripId = demoUuid(`transport-trip-${route.code.toLowerCase()}`);
    transportRouteIds.push(routeId);
    transportStopIds[routeIndex] = [];

    await writer.upsert('transport_routes', { id: routeId, tenant_id: tenantId, name: route.name, code: route.code, zone: route.zone, fare_amount_minor: route.fareAmountMinor, status: 'active', created_by_user_id: context.actorUserId });
    for (const [stopIndex, stop] of route.stops.entries()) {
      const stopId = demoUuid(`transport-stop-${route.code.toLowerCase()}-${stopIndex + 1}`);
      transportStopIds[routeIndex].push(stopId);
      await writer.upsert('transport_route_stops', { id: stopId, tenant_id: tenantId, route_id: routeId, name: stop.name, stop_sequence: stopIndex + 1, planned_time: stop.plannedTime, notes: stopIndex === route.stops.length - 1 ? 'School destination' : 'Morning pickup point' });
    }

    await writer.upsert('transport_manifests', { id: manifestId, tenant_id: tenantId, route_id: routeId, academic_term_id: termId, effective_from: '2026-05-04', status: 'active', created_by_user_id: context.actorUserId });
    for (let offset = 0; offset < 2; offset += 1) {
      const studentIndex = routeIndex * 2 + offset;
      await writer.upsert('transport_manifest_students', { id: demoUuid(`transport-manifest-student-${routeIndex + 1}-${offset + 1}`), tenant_id: tenantId, manifest_id: manifestId, student_id: studentIds[studentIndex], pickup_stop_id: transportStopIds[routeIndex][0], dropoff_stop_id: transportStopIds[routeIndex][2], boarding_status: 'active', guardian_contact: studentRoster[studentIndex]?.guardian.phone, notes: `${studentRoster[studentIndex]?.firstName} ${studentRoster[studentIndex]?.lastName} assigned to ${route.name}` });
    }
    await writer.upsert('transport_trips', { id: tripId, tenant_id: tenantId, route_id: routeId, vehicle_id: transportVehicleIds[routeIndex % transportVehicleIds.length], driver_id: transportDriverIds[routeIndex % transportDriverIds.length], manifest_id: manifestId, trip_date: '2026-05-24', direction: 'morning', scheduled_start_at: route.stops[0]?.plannedTime, actual_start_at: '2026-05-24T03:05:00.000Z', actual_end_at: '2026-05-24T03:58:00.000Z', learner_count: 2, status: routeIndex === 1 ? 'incident' : 'completed', started_by_user_id: context.actorUserId });
    await writer.insertOnce('transport_trip_events', { id: demoUuid(`transport-trip-event-${routeIndex + 1}-departed`), tenant_id: tenantId, trip_id: tripId, event_type: 'departed', stop_id: transportStopIds[routeIndex][0], event_time: '2026-05-24T03:05:00.000Z', notes: `${route.name} departed first stop`, recorded_by_user_id: context.actorUserId, metadata: meta({ route: route.name }) });
    await writer.insertOnce('transport_trip_events', { id: demoUuid(`transport-trip-event-${routeIndex + 1}-arrived`), tenant_id: tenantId, trip_id: tripId, event_type: routeIndex === 1 ? 'delay' : 'arrived', stop_id: transportStopIds[routeIndex][2], event_time: '2026-05-24T03:58:00.000Z', notes: routeIndex === 1 ? 'Delayed by mechanical inspection near Kondele' : `${route.name} arrived at school`, recorded_by_user_id: context.actorUserId, metadata: meta({ route: route.name }) });
  }
  await writer.upsert('transport_alerts', { id: demoUuid('transport-alert-maintenance-1'), tenant_id: tenantId, route_id: transportRouteIds[1], vehicle_id: transportVehicleIds[1], title: 'Bus marked for maintenance', message: 'KDC 448M needs service before afternoon route.', severity: 'warning', status: 'open', notify_parent: true, metadata: meta({ source_dashboard: 'Transport Manager', visible_to: ['Principal', 'System Monitor', 'Parent'] }) });
  await writer.upsert('vehicle_service_logs', { id: demoUuid('vehicle-service-kdc-448m-1'), tenant_id: tenantId, vehicle_id: transportVehicleIds[1], service_date: '2026-05-24', odometer_reading: 84220, next_service_date: '2026-06-02', cost_minor: 1850000, service_provider: 'Kisumu Bus Care Garage', notes: 'Brake inspection and oil service booked.', recorded_by_user_id: context.actorUserId });
  await writer.insertOnce('transport_audit_logs', { id: demoUuid('transport-audit-seed-1'), tenant_id: tenantId, actor_user_id: context.actorUserId, action: 'transport.demo_routes_seeded', resource_type: 'transport_demo_seed', resource_id: transportRouteIds[0], metadata: meta({ routes: transportRoutes.length, vehicles: vehicles.length, drivers: drivers.length, active_students: 12 }) });

  await writer.upsert('procurement_suppliers', { id: procurementSupplierId, tenant_id: tenantId, name: 'Lake Demo Traders', contact_phone: '+254755100001', status: 'active' });
  await writer.upsert('procurement_requests', { id: procurementRequestId, tenant_id: tenantId, title: 'Chemistry reagents restock', department: 'Science', requested_by_user_id: context.teacherUserId, status: 'submitted' });
  await writer.upsert('procurement_request_items', { id: demoUuid('procurement-request-item-1'), tenant_id: tenantId, request_id: procurementRequestId, item_name: 'Chemistry reagent set', quantity: 5, estimated_unit_cost_minor: 250000 });
  await writer.upsert('procurement_approvals', { id: demoUuid('procurement-approval-1'), tenant_id: tenantId, request_id: procurementRequestId, decision: 'approved', approver_user_id: context.actorUserId });
  await writer.upsert('purchase_orders', { id: purchaseOrderId, tenant_id: tenantId, po_number: 'KB-PO-DEMO-001', supplier_id: procurementSupplierId, created_by_user_id: context.actorUserId, status: 'issued' });
  await writer.upsert('purchase_order_items', { id: demoUuid('purchase-order-item-1'), tenant_id: tenantId, purchase_order_id: purchaseOrderId, item_name: 'Exercise books', quantity: 600, unit_cost_minor: 2500 });
  await writer.upsert('supplier_invoices', { id: demoUuid('supplier-invoice-1'), tenant_id: tenantId, purchase_order_id: purchaseOrderId, invoice_number: 'SUP-KB-DEMO-001', amount_minor: 1500000, attached_by_user_id: context.actorUserId, status: 'attached' });

  await writer.upsert('clinic_locations', { id: clinicLocationId, tenant_id: tenantId, name: 'Main Sick Bay', branch_type: 'main', location: 'Administration Block', is_active: true });
  const medicineCatalog = buildKisumuBoysDemoMedicineCatalog();
  const clinicMedicineIds: string[] = [];
  const clinicBatchIds: string[] = [];
  for (const [index, medicine] of medicineCatalog.entries()) {
    const medicineKey = medicine.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const medicineId = demoUuid(`clinic-medicine-${medicineKey}`);
    const batchId = demoUuid(`clinic-batch-${medicineKey}`);
    clinicMedicineIds.push(medicineId);
    clinicBatchIds.push(batchId);

    await writer.upsert('clinic_medicines', { id: medicineId, tenant_id: tenantId, clinic_location_id: clinicLocationId, medicine_name: medicine.name, category: medicine.category, supplier: 'Kisumu Demo Supplies Ltd', unit_type: medicine.unitType, storage_location: 'Main Sick Bay', cost_price_minor: index < 3 ? 500 : 1200, created_by_user_id: context.actorUserId });
    await writer.upsert('clinic_medicine_batches', { id: batchId, tenant_id: tenantId, medicine_id: medicineId, batch_number: `KB-CLINIC-${String(index + 1).padStart(3, '0')}`, expiry_date: medicine.expiryDate, date_received: '2026-05-04', quantity_received: medicine.quantityReceived, quantity_available: medicine.quantityAvailable, minimum_stock_threshold: medicine.reorderLevel, storage_location: 'Main Sick Bay', status: 'active', created_by_user_id: context.actorUserId });
    await writer.insertOnce('clinic_stock_movements', { id: demoUuid(`clinic-stock-received-${medicineKey}`), tenant_id: tenantId, medicine_id: medicineId, batch_id: batchId, movement_type: 'received', quantity: medicine.quantityReceived, before_quantity: 0, after_quantity: medicine.quantityReceived, reference: `KB-CLINIC-GRN-${String(index + 1).padStart(3, '0')}`, reason: 'Opening demo clinic stock', actor_user_id: context.actorUserId, metadata: meta({ medicine: medicine.name }) });

    if (medicine.lowStock) {
      await writer.upsert('clinic_alerts', { id: demoUuid(`clinic-alert-low-${medicineKey}`), tenant_id: tenantId, alert_type: 'low_stock', severity: 'warning', medicine_id: medicineId, batch_id: batchId, title: `${medicine.name} low stock`, message: `${medicine.name} is below the reorder level at Kisumu Boys sick bay.`, status: 'open', notify_principal: true, metadata: meta({ quantity_available: medicine.quantityAvailable, reorder_level: medicine.reorderLevel }) });
      await writer.upsert('clinic_procurement_recommendations', { id: demoUuid(`clinic-procurement-${medicineKey}`), tenant_id: tenantId, medicine_id: medicineId, batch_id: batchId, item_name: medicine.name, batch_number: `KB-CLINIC-${String(index + 1).padStart(3, '0')}`, quantity_available: medicine.quantityAvailable, minimum_stock_threshold: medicine.reorderLevel, shortage_quantity: medicine.reorderLevel - medicine.quantityAvailable, recommended_order_quantity: medicine.reorderLevel * 2, recommendation_status: 'open', metadata: meta({ source: 'nurse_low_stock_alert' }) });
    }
  }

  const clinicVisits = [
    { studentIndex: 0, symptoms: 'Headache and mild fever', diagnosis: 'Suspected viral infection', treatment: 'Paracetamol issued and parent SMS sent', medicineIndex: 0, quantity: 2, status: 'completed' },
    { studentIndex: 6, symptoms: 'Stomach upset after breakfast', diagnosis: 'Indigestion', treatment: 'Antacid issued, class teacher notified', medicineIndex: 2, quantity: 2, status: 'completed' },
    { studentIndex: 11, symptoms: 'Dehydration after games', diagnosis: 'Mild dehydration', treatment: 'ORS issued and monitored in sick bay', medicineIndex: 1, quantity: 1, status: 'completed' },
    { studentIndex: 18, symptoms: 'Cut on left hand during lab practical', diagnosis: 'Minor cut', treatment: 'Cleaned and bandaged', medicineIndex: 3, quantity: 1, status: 'completed' },
    { studentIndex: 24, symptoms: 'Persistent cough and high temperature', diagnosis: 'Referral recommended', treatment: 'Guardian notified for hospital review', medicineIndex: 0, quantity: 2, status: 'referred' },
  ];
  for (const [index, visit] of clinicVisits.entries()) {
    const visitId = demoUuid(`clinic-visit-${index + 1}`);
    await writer.upsert('clinic_visits', { id: visitId, tenant_id: tenantId, clinic_location_id: clinicLocationId, student_id: studentIds[visit.studentIndex], recorded_by_user_id: context.actorUserId, visit_date: '2026-05-24', visit_time: ['07:40', '08:15', '09:05', '10:20', '11:30'][index], symptoms_summary: visit.symptoms, diagnosis_summary: visit.diagnosis, treatment_summary: visit.treatment, status: visit.status });
    await writer.upsert('clinic_medicine_dispenses', { id: demoUuid(`clinic-dispense-${index + 1}`), tenant_id: tenantId, visit_id: visitId, medicine_id: clinicMedicineIds[visit.medicineIndex], batch_id: clinicBatchIds[visit.medicineIndex], quantity_dispensed: visit.quantity, dosage: visit.medicineIndex === 3 ? 'Applied once' : 'As directed by nurse', duration: '1 day', instructions: visit.treatment, dispensed_by_user_id: context.actorUserId });
    await writer.insertOnce('clinic_stock_movements', { id: demoUuid(`clinic-stock-dispensed-${index + 1}`), tenant_id: tenantId, medicine_id: clinicMedicineIds[visit.medicineIndex], batch_id: clinicBatchIds[visit.medicineIndex], visit_id: visitId, movement_type: 'dispensed', quantity: visit.quantity, reference: `KB-CLINIC-DISP-${String(index + 1).padStart(3, '0')}`, reason: visit.symptoms, actor_user_id: context.actorUserId, metadata: meta({ student_id: studentIds[visit.studentIndex], parent_notified: true }) });
  }
  await writer.insertOnce('clinic_audit_logs', { id: demoUuid('clinic-audit-seed-1'), tenant_id: tenantId, actor_user_id: context.actorUserId, action: 'clinic.demo_sick_bay_seeded', resource_type: 'clinic_demo_seed', resource_id: clinicLocationId, metadata: meta({ medicines: medicineCatalog.length, visits: clinicVisits.length, low_stock_alerts: medicineCatalog.filter((medicine) => medicine.lowStock).length }) });

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

  const boardingHouses = buildKisumuBoysDemoBoardingHouses();
  const boardingHouseIds = boardingHouses.map((house) => demoUuid(`boarding-house-${house.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`));
  for (const [index, house] of boardingHouses.entries()) {
    const houseId = boardingHouseIds[index];
    await writer.upsert('boarding_houses', {
      id: houseId,
      tenant_id: tenantId,
      title: house.name,
      category: 'hostel',
      owner_name: index % 2 === 0 ? 'Boarding Master Otieno' : 'Assistant Boarding Master Achieng',
      status: house.missing > 0 ? 'open' : 'active',
      priority: house.missing > 0 ? 'critical' : 'normal',
      metric_count: house.present,
      notes: house.issue ?? `${house.name} roll call clear.`,
      metadata: meta({ capacity: house.capacity, present: house.present, missing: house.missing }),
      created_by_user_id: context.actorUserId,
    });
    await writer.upsert('boarding_meals', { id: demoUuid(`boarding-meal-${index + 1}`), tenant_id: tenantId, house_id: houseId, meal_date: '2026-05-24', meal_type: 'supper', planned_count: house.capacity, consumed_count: house.present, status: 'served' });
    await writer.upsert('boarding_dormitory_checks', { id: demoUuid(`boarding-check-${index + 1}`), tenant_id: tenantId, house_id: houseId, checked_by_user_id: context.actorUserId, check_status: house.missing > 0 ? 'attention_required' : 'clear', notes: house.issue ?? 'Roll call complete.', checked_at: '2026-05-24T18:30:00.000Z' });
  }
  for (let index = 0; index < 18; index += 1) {
    const houseIndex = index % boardingHouses.length;
    await writer.upsert('boarding_students', { id: demoUuid(`boarding-student-${index + 1}`), tenant_id: tenantId, house_id: boardingHouseIds[houseIndex], student_id: studentIds[index], bed_label: `${boardingHouses[houseIndex]?.name.slice(0, 1).toUpperCase()}-${String(index + 10).padStart(2, '0')}`, status: index === 2 ? 'late_return' : 'active' });
  }
  await writer.upsert('boarding_incidents', { id: demoUuid('boarding-incident-1'), tenant_id: tenantId, house_id: boardingHouseIds[0], student_id: studentIds[2], title: 'Late return after evening prep', severity: 'critical', status: 'open' });
  await writer.upsert('boarding_incidents', { id: demoUuid('boarding-incident-2'), tenant_id: tenantId, house_id: boardingHouseIds[2], student_id: studentIds[12], title: 'Exeat approval waiting', severity: 'warning', status: 'open' });
  await writer.insertOnce('boarding_audit_logs', { id: demoUuid('boarding-audit-seed-1'), tenant_id: tenantId, actor_user_id: context.actorUserId, action: 'boarding.demo_roll_call_seeded', resource_type: 'boarding_demo_seed', resource_id: boardingHouseIds[0], metadata: meta({ houses: boardingHouses.length, boarders_seeded: 18, missing: boardingHouses.reduce((total, house) => total + house.missing, 0) }) });
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
  const visitors = buildKisumuBoysDemoVisitors();
  for (const [index, visitor] of visitors.entries()) {
    const checkinId = demoUuid(`visitor-checkin-${index + 1}`);
    const appointmentId = index === 0 ? visitorAppointmentId : demoUuid(`visitor-appointment-${index + 1}`);
    const badgeId = index === 0 ? visitorBadgeId : demoUuid(`visitor-badge-${index + 1}`);
    await writer.upsert('visitor_checkins', {
      id: checkinId,
      tenant_id: tenantId,
      title: visitor.name,
      category: visitor.reason,
      owner_name: visitor.visiting,
      status: visitor.status,
      priority: visitor.priority,
      metric_count: visitor.status === 'inside' ? 1 : 0,
      notes: `${visitor.phoneOrId} visiting ${visitor.visiting}.`,
      metadata: meta({ phone_or_id: visitor.phoneOrId, reason: visitor.reason, checkin_time: `2026-05-24T0${Math.min(index + 6, 9)}:15:00.000Z` }),
      created_by_user_id: context.actorUserId,
    });
    await writer.upsert('visitor_appointments', { id: appointmentId, tenant_id: tenantId, visitor_name: visitor.name, host_user_id: index === 1 || index === 2 ? context.actorUserId : context.teacherUserId, appointment_at: `2026-05-24T0${Math.min(index + 6, 9)}:00:00.000Z`, status: visitor.status === 'exited' ? 'completed' : 'scheduled' });
    await writer.upsert('visitor_badges', { id: badgeId, tenant_id: tenantId, checkin_id: checkinId, badge_number: `KB-VIS-DEMO-${String(index + 1).padStart(3, '0')}`, status: visitor.status === 'exited' ? 'returned' : 'issued', returned_at: visitor.status === 'exited' ? '2026-05-24T10:30:00.000Z' : undefined });
  }
  await writer.upsert('visitor_emergency_logs', { id: demoUuid('visitor-emergency-1'), tenant_id: tenantId, checkin_id: demoUuid('visitor-checkin-7'), event_type: 'overstay', severity: 'critical', notes: 'Deputy Principal notified about overstayed discipline follow-up visitor.' });
  await writer.insertOnce('visitor_audit_logs', { id: demoUuid('visitor-audit-seed-1'), tenant_id: tenantId, actor_user_id: context.actorUserId, action: 'visitors.demo_gate_rush_seeded', resource_type: 'visitor_demo_seed', resource_id: demoUuid('visitor-checkin-1'), metadata: meta({ visitors: visitors.length, inside: visitors.filter((visitor) => visitor.status === 'inside').length, overstayed: visitors.filter((visitor) => visitor.status === 'overstayed').length }) });
  await writer.upsert('asset_assignments', { id: demoUuid('asset-assignment-1'), tenant_id: tenantId, asset_tag: 'KB-ASSET-PROJ-001', assigned_to_type: 'department', assigned_to_label: 'Science Department', status: 'active' });
  await writer.upsert('asset_repairs', { id: demoUuid('asset-repair-1'), tenant_id: tenantId, asset_tag: 'KB-ASSET-PROJ-001', issue_title: 'Projector lamp replacement', status: 'open' });
  await writer.upsert('asset_depreciation_entries', { id: demoUuid('asset-depreciation-1'), tenant_id: tenantId, asset_tag: 'KB-ASSET-PROJ-001', depreciation_month: '2026-05-01', amount_minor: 45000 });

  await writer.upsert('iot_devices', { id: iotDeviceId, tenant_id: tenantId, name: 'Water Tank Sensor', device_type: 'water_level', status: 'online', metadata: meta() });
  await writer.upsert('iot_telemetry_readings', { id: demoUuid('iot-reading-1'), tenant_id: tenantId, device_id: iotDeviceId, metric_name: 'water_level_percent', metric_value: 72, recorded_at: '2026-05-24T08:00:00.000Z', metadata: meta() });
  await writer.upsert('iot_device_commands', { id: demoUuid('iot-command-1'), tenant_id: tenantId, device_id: iotDeviceId, command_type: 'calibrate', status: 'queued' });
  await writer.upsert('iot_alerts', { id: demoUuid('iot-alert-1'), tenant_id: tenantId, title: 'Water level stable', message: 'Demo IoT water tank reading normal.', severity: 'info', metadata: meta() });

  await writer.upsert('school_sms_wallets', { id: demoUuid('sms-wallet-1'), tenant_id: tenantId, sms_balance: 2500, monthly_used: 120, allow_negative_balance: false });
  const smsMessages = [
    { key: 'absence', status: 'delivered', body: 'Kisumu Boys: Your son was marked absent today. Please contact the class teacher.' },
    { key: 'fee-reminder', status: 'queued', body: 'Kisumu Boys: Kindly clear the pending fee balance before the end of the week.' },
    { key: 'clinic', status: 'delivered', body: 'Kisumu Boys: Your son was attended to at the sick bay and is stable.' },
    { key: 'library', status: 'queued', body: 'Kisumu Boys: Library book is overdue. Please remind your son to return it.' },
    { key: 'boarding', status: 'failed', body: 'Kisumu Boys: Boarding office has recorded a late return requiring follow-up.' },
  ];
  for (const [index, sms] of smsMessages.entries()) {
    await writer.upsert('sms_logs', { id: demoUuid(`sms-log-${sms.key}`), tenant_id: tenantId, recipient_ciphertext: `demo-redacted-${index + 1}`, recipient_hash: `kb-demo-recipient-${index + 1}`, status: sms.status, message_body: sms.body, metadata: meta({ guardian_id: guardianIds[index], student_id: studentIds[index] }) });
  }
  for (const notification of buildKisumuBoysDemoOperationalNotifications()) {
    await writer.upsert('notifications', {
      id: demoUuid(`notification-${notification.key}`),
      tenant_id: tenantId,
      notification_key: `KB-DEMO-${notification.key}`,
      recipient_guardian_id: notification.targetGuardianIndex === undefined ? undefined : guardianIds[notification.targetGuardianIndex],
      type: notification.type,
      title: notification.title,
      body: notification.body,
      status: notification.priority === 'normal' ? 'sent' : 'unread',
      metadata: meta({ audience_roles: notification.audienceRoles, priority: notification.priority, source: 'kisumu_boys_demo_seed' }),
    });
  }
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
