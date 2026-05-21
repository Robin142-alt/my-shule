import { Client } from 'pg';

import { runQueryPlanReview } from './query-plan-review';

export interface QueryPlanReviewLocalFixtureTable {
  name: string;
  ddl: string;
  indexes: string[];
}

export const QUERY_PLAN_REVIEW_LOCAL_FIXTURE_TABLES: QueryPlanReviewLocalFixtureTable[] = [
  {
    name: 'students',
    ddl: `
      CREATE TABLE IF NOT EXISTS students (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        admission_number text NOT NULL DEFAULT '',
        first_name text NOT NULL DEFAULT '',
        middle_name text,
        last_name text NOT NULL DEFAULT '',
        primary_guardian_name text,
        primary_guardian_phone text
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_students_search
        ON students
        USING GIN (
          to_tsvector(
            'simple',
            admission_number || ' ' ||
            first_name || ' ' ||
            COALESCE(middle_name, '') || ' ' ||
            last_name || ' ' ||
            COALESCE(primary_guardian_name, '') || ' ' ||
            COALESCE(primary_guardian_phone, '')
          )
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_students_tenant_name
        ON students (tenant_id, last_name, first_name)
      `,
    ],
  },
  {
    name: 'admission_applications',
    ddl: `
      CREATE TABLE IF NOT EXISTS admission_applications (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        application_number text NOT NULL DEFAULT '',
        full_name text NOT NULL DEFAULT '',
        birth_certificate_number text NOT NULL DEFAULT '',
        class_applying text NOT NULL DEFAULT '',
        parent_name text NOT NULL DEFAULT '',
        parent_phone text NOT NULL DEFAULT '',
        parent_email text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_admission_applications_search
        ON admission_applications
        USING GIN (
          to_tsvector(
            'simple',
            application_number || ' ' ||
            full_name || ' ' ||
            birth_certificate_number || ' ' ||
            class_applying || ' ' ||
            parent_name || ' ' ||
            parent_phone || ' ' ||
            COALESCE(parent_email, '')
          )
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_admission_applications_tenant_created
        ON admission_applications (tenant_id, created_at DESC)
      `,
    ],
  },
  {
    name: 'inventory_items',
    ddl: `
      CREATE TABLE IF NOT EXISTS inventory_items (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        item_name text NOT NULL DEFAULT '',
        sku text NOT NULL DEFAULT '',
        unit text NOT NULL DEFAULT '',
        storage_location text,
        notes text,
        status text NOT NULL DEFAULT 'active'
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_inventory_items_search
        ON inventory_items
        USING GIN (
          to_tsvector(
            'simple',
            item_name || ' ' ||
            sku || ' ' ||
            unit || ' ' ||
            COALESCE(storage_location, '') || ' ' ||
            COALESCE(notes, '')
          )
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_inventory_items_tenant_status_name
        ON inventory_items (tenant_id, status, item_name)
      `,
    ],
  },
  {
    name: 'teacher_subject_assignments',
    ddl: `
      CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        teacher_user_id uuid NOT NULL,
        academic_term_id uuid NOT NULL,
        class_section_id uuid NOT NULL,
        subject_id uuid NOT NULL
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_teacher_subject_assignments_teacher
        ON teacher_subject_assignments (tenant_id, teacher_user_id, academic_term_id)
      `,
    ],
  },
  {
    name: 'exam_marks',
    ddl: `
      CREATE TABLE IF NOT EXISTS exam_marks (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        exam_series_id uuid NOT NULL,
        assessment_id uuid NOT NULL,
        score numeric,
        status text NOT NULL DEFAULT 'draft',
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_exam_marks_student_series
        ON exam_marks (tenant_id, student_id, exam_series_id, updated_at DESC)
      `,
    ],
  },
  {
    name: 'student_fee_payment_allocations',
    ddl: `
      CREATE TABLE IF NOT EXISTS student_fee_payment_allocations (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        invoice_id uuid NOT NULL,
        amount_minor integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_student_fee_payment_allocations_student
        ON student_fee_payment_allocations (tenant_id, student_id, created_at DESC)
      `,
    ],
  },
  {
    name: 'support_status_subscriptions',
    ddl: `
      CREATE TABLE IF NOT EXISTS support_status_subscriptions (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        contact_hash text NOT NULL,
        locale text NOT NULL DEFAULT 'en',
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_support_status_subscriptions_active
        ON support_status_subscriptions (tenant_id, status, created_at)
      `,
    ],
  },
  {
    name: 'staff_profiles',
    ddl: `
      CREATE TABLE IF NOT EXISTS staff_profiles (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        staff_number text NOT NULL DEFAULT '',
        display_name text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'active'
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_staff_profiles_directory
        ON staff_profiles (tenant_id, status, display_name)
      `,
    ],
  },
  {
    name: 'library_catalog_items',
    ddl: `
      CREATE TABLE IF NOT EXISTS library_catalog_items (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        title text NOT NULL DEFAULT '',
        author text NOT NULL DEFAULT ''
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_library_catalog_items_title_trgm
        ON library_catalog_items
        USING GIN (lower(title) gin_trgm_ops)
      `,
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_library_catalog_items_tenant_title
        ON library_catalog_items (tenant_id, title)
      `,
    ],
  },
  {
    name: 'timetable_slots',
    ddl: `
      CREATE TABLE IF NOT EXISTS timetable_slots (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        day_of_week integer NOT NULL,
        starts_at time NOT NULL,
        teacher_id uuid,
        class_section_id uuid,
        room_id uuid
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_timetable_slots_lookup
        ON timetable_slots (tenant_id, academic_year, term_name, day_of_week, starts_at)
      `,
    ],
  },
  {
    name: 'support_tickets',
    ddl: `
      CREATE TABLE IF NOT EXISTS support_tickets (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        ticket_number text NOT NULL DEFAULT '',
        subject text NOT NULL DEFAULT '',
        category text NOT NULL DEFAULT '',
        module_affected text NOT NULL DEFAULT '',
        description text NOT NULL DEFAULT '',
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_support_tickets_search
        ON support_tickets
        USING GIN (
          to_tsvector(
            'simple'::regconfig,
            ticket_number || ' ' ||
            subject || ' ' ||
            category || ' ' ||
            module_affected || ' ' ||
            description
          )
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_support_tickets_tenant_updated
        ON support_tickets (tenant_id, updated_at DESC)
      `,
    ],
  },
  {
    name: 'discipline_incidents',
    ddl: `
      CREATE TABLE IF NOT EXISTS discipline_incidents (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        incident_number text NOT NULL DEFAULT '',
        title text NOT NULL DEFAULT '',
        severity text NOT NULL DEFAULT 'low',
        status text NOT NULL DEFAULT 'open',
        occurred_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_discipline_incidents_queue
        ON discipline_incidents (tenant_id, status, severity, occurred_at DESC, created_at DESC)
        WHERE deleted_at IS NULL
      `,
    ],
  },
  {
    name: 'counselling_sessions',
    ddl: `
      CREATE TABLE IF NOT EXISTS counselling_sessions (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        counsellor_user_id uuid NOT NULL,
        scheduled_for timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'scheduled'
      )
    `,
    indexes: [
      `
        CREATE INDEX IF NOT EXISTS ix_query_plan_counselling_sessions_schedule
        ON counselling_sessions (tenant_id, counsellor_user_id, status, scheduled_for)
      `,
    ],
  },
];

export function buildQueryPlanReviewLocalFixtureSql(): string {
  return [
    'CREATE EXTENSION IF NOT EXISTS pg_trgm',
    ...QUERY_PLAN_REVIEW_LOCAL_FIXTURE_TABLES.flatMap((table) => [
      table.ddl,
      ...table.indexes,
    ]),
  ]
    .map((statement) => statement.trim())
    .join(';\n\n')
    .concat(';\n');
}

export async function bootstrapQueryPlanReviewLocalFixture(client: Client): Promise<void> {
  await client.query(buildQueryPlanReviewLocalFixtureSql());
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    process.stderr.write('Set DATABASE_URL before running local query-plan fixture review.\n');
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    await bootstrapQueryPlanReviewLocalFixture(client);
    await client.query('BEGIN');
    await client.query('SET LOCAL enable_seqscan = off');

    const result = await runQueryPlanReview({
      query: async (sql, values) => client.query(sql, [...values]),
    });

    await client.query('COMMIT');
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failures; the original error is more useful.
    }

    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
