import { createHash } from 'node:crypto';
require('dotenv').config();

import { Client } from 'pg';

export const ONBOARDING_SEED_KEY = 'onboarding-base-v1';

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
  demo_seed_key: ONBOARDING_SEED_KEY,
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
    seedKey: ONBOARDING_SEED_KEY,
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
    { key: 'fees-arrears-follow-up', type: 'finance.alert', title: '42 students above KSh 10,000 balance', body: 'Accountant has prepared fee reminder SMS for approval.', audienceRoles: ['principal', 'deputy_principal', 'accountant', 'secretary'], priority: 'important' },
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



export function assertOnboardingTenantSelection(rows: TenantSelectionRow[]): TenantSelectionRow {
  if (rows.length !== 1) {
    throw new Error("ERROR: Tenant not found.");
  }
  return rows[0];
}

function demoUuid(key: string): string {
  const hash = createHash('sha256').update(`${ONBOARDING_SEED_KEY}:${key}`).digest();

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

class BaseSeedWriter {
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
      seed_key: ONBOARDING_SEED_KEY,
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
      [this.tenant.tenant_id, actorUserId, ONBOARDING_SEED_KEY],
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
        [this.tenant.tenant_id, ONBOARDING_SEED_KEY],
      );

      total += Number(result.rows[0]?.count ?? 0);
    }

    this.summary.outside_demo_rows = total;
    return total;
  }
}

async function resolveTenant(client: Client, targetTenantId: string): Promise<TenantSelectionRow> {
  const result = await client.query<TenantSelectionRow>(`
      SELECT id::text, tenant_id, name, subdomain
      FROM tenants
      WHERE tenant_id = $1
    `, [targetTenantId]);

  return assertOnboardingTenantSelection(result.rows);
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

async function seedDemoRows(writer: BaseSeedWriter, context: DemoContext): Promise<void> {
  // Do nothing, base onboarding is empty.
}

async function runSeed(apply: boolean): Promise<SeedSummary> {
  if (apply && !process.argv.includes('--confirm-onboarding')) { throw new Error('Refusing to mutate data without --confirm-onboarding.'); }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const targetTenantId = process.env.TARGET_TENANT_ID;
    if (!targetTenantId) throw new Error('TARGET_TENANT_ID is required');
    const tenant = await resolveTenant(client, targetTenantId);
    const users = await resolveUsers(client, tenant.tenant_id);
    const billingSubscriptionId = await resolveActiveSubscriptionId(client, tenant.tenant_id);
    const writer = new BaseSeedWriter(client, tenant, !apply);
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
  const plan = { seedKey: ONBOARDING_SEED_KEY };

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
