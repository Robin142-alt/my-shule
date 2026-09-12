// These are existing workflow contracts which were previously present only in
// manually run SQL scripts. Keep initialization tenant scoped and idempotent.
const scopedTables = [
  'school_expenses', 'academics_lesson_plans', 'student_welfare_cases',
  'counselling_followups', 'parent_contact_logs', 'boarding_hostels', 'boarding_beds',
  'academics_assignments', 'academics_resources', 'academics_lesson_logs',
  'school_tasks', 'school_meetings', 'student_requests',
];

// Preserve both contracts during upgrades. jsonb_populate_record ignores keys
// absent from a table, so this also works on databases created by the SQL schema.
const academicAliases = ['academics_assignments', 'academics_resources', 'academics_lesson_logs'];
const fieldAliases = [
  ['inventory_stock_movements', 'item_id', 'inventory_item_id'],
  ['transport_routes', 'code', 'route_code'],
  ['inventory_categories', 'category_name', 'name'],
  ['boarding_houses', 'title', 'name'],
  ['assets', 'title', 'name'],
  ['inventory_requests', 'requested_by', 'requested_by_user_id', 'notes', 'reason'],
];

export const SIDEBAR_WORKSPACE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS school_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    assigned_to uuid NOT NULL, title text NOT NULL, due_date timestamptz,
    status text NOT NULL DEFAULT 'PENDING', created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS school_meetings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    title text NOT NULL, description text, start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL, organizer_id uuid NOT NULL, status text NOT NULL DEFAULT 'SCHEDULED',
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS student_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    student_id text NOT NULL, request_type text NOT NULL, description text NOT NULL,
    requested_by text NOT NULL, status text NOT NULL DEFAULT 'PENDING',
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS school_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    category text NOT NULL, description text NOT NULL, amount_minor bigint NOT NULL CHECK (amount_minor > 0),
    status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS academics_lesson_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    teacher_id uuid NOT NULL, subject_id text NOT NULL, class_id text NOT NULL,
    week_number integer, term_id text, topic text NOT NULL, objectives text,
    activities text, resources text, status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS student_welfare_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    student_id text NOT NULL, category text NOT NULL, description text,
    action_taken text, status text NOT NULL DEFAULT 'open', reported_by uuid,
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS counselling_followups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    school_id text, case_id uuid, student_id text NOT NULL, reason text NOT NULL,
    due_date date NOT NULL, priority text, assigned_to uuid, status text NOT NULL DEFAULT 'pending',
    completed_at timestamptz, notes text, created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS parent_contact_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    school_id text, student_id text NOT NULL, case_id uuid, guardian_id uuid,
    contact_method text, reason text NOT NULL, summary text, agreed_action text,
    follow_up_date date, contacted_by uuid, status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS boarding_hostels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    hostel_name text NOT NULL, capacity integer NOT NULL CHECK (capacity > 0),
    gender_allowed text NOT NULL, warden_id uuid, status text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, id)
  );
  CREATE TABLE IF NOT EXISTS boarding_beds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    hostel_id uuid NOT NULL, room_number text NOT NULL, bed_number text NOT NULL,
    assigned_student_id text, status text NOT NULL DEFAULT 'AVAILABLE',
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, hostel_id, room_number, bed_number)
  );

  ${academicAliases.map(table => `
    ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id text;
    ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS class_id text;
    ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS teacher_id uuid;
    UPDATE ${table} record SET tenant_id = tenant.tenant_id
    FROM tenants tenant LEFT JOIN schools school ON school.slug = tenant.subdomain
    WHERE record.tenant_id IS NULL
      AND (to_jsonb(record)->>'school_id' = school.id OR to_jsonb(record)->>'school_id' = tenant.tenant_id OR to_jsonb(record)->>'school_id' = tenant.id::text);
    UPDATE ${table} record SET class_id = to_jsonb(record)->>'class_section_id'
      WHERE class_id IS NULL AND to_jsonb(record)->>'class_section_id' IS NOT NULL;
    UPDATE ${table} record SET teacher_id = (to_jsonb(record)->>'teacher_user_id')::uuid
      WHERE teacher_id IS NULL AND to_jsonb(record)->>'teacher_user_id' IS NOT NULL;
    ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE ${table} ALTER COLUMN updated_at SET DEFAULT NOW();
    CREATE INDEX IF NOT EXISTS ix_${table}_workspace_actor ON ${table} (tenant_id, teacher_id);
  `).join('\n')}
  ALTER TABLE academics_lesson_logs ADD COLUMN IF NOT EXISTS plan_id uuid;
  ALTER TABLE academics_lesson_logs ADD COLUMN IF NOT EXISTS log_date date;
  ALTER TABLE academics_lesson_logs ADD COLUMN IF NOT EXISTS covered_topics text;
  UPDATE academics_lesson_logs record SET log_date = (to_jsonb(record)->>'date')::date WHERE log_date IS NULL;
  UPDATE academics_lesson_logs record SET covered_topics = to_jsonb(record)->>'topic' WHERE covered_topics IS NULL;

  CREATE OR REPLACE FUNCTION sync_sidebar_academic_contract() RETURNS trigger
  LANGUAGE plpgsql AS $$
  DECLARE
    value jsonb := to_jsonb(NEW);
    previous jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
    pair text[];
    resolved_tenant text;
    resolved_school text;
  BEGIN
    IF value ? 'school_id' THEN
      SELECT tenant.tenant_id, school.id INTO resolved_tenant, resolved_school
      FROM tenants tenant LEFT JOIN schools school ON school.slug = tenant.subdomain
      WHERE (value->>'tenant_id' IS NULL OR tenant.tenant_id = value->>'tenant_id')
        AND (value->>'school_id' IS NULL OR value->>'school_id' IN (school.id, tenant.tenant_id, tenant.id::text));
      IF resolved_tenant IS NULL THEN
        RAISE EXCEPTION 'Academic record school and tenant do not match' USING ERRCODE = '23514';
      END IF;
      value := value || jsonb_build_object('tenant_id', resolved_tenant,
        'school_id', COALESCE(value->>'school_id', resolved_school, resolved_tenant));
    END IF;
    IF value ? 'class_section_id' THEN
      IF value->>'class_id' IS NULL OR (TG_OP = 'UPDATE'
        AND value->'class_section_id' IS DISTINCT FROM previous->'class_section_id'
        AND value->'class_id' IS NOT DISTINCT FROM previous->'class_id') THEN
        value := value || jsonb_build_object('class_id', value->'class_section_id');
      ELSIF value->>'class_id' IS DISTINCT FROM value->>'class_section_id' THEN
        -- The legacy classes FK cannot reference a new class_sections record.
        -- Preserve its canonical class_id and fill the legacy alias only when
        -- that same school-owned class exists in the older registry.
        value := value || jsonb_build_object('class_section_id',
          (SELECT id FROM classes WHERE id = value->>'class_id' AND school_id = value->>'school_id'));
      END IF;
    END IF;
    FOREACH pair SLICE 1 IN ARRAY ARRAY[
      ['teacher_id','teacher_user_id'],
      ['log_date','date'], ['covered_topics','topic']
    ] LOOP
      IF value ? pair[1] AND value ? pair[2] THEN
        IF TG_OP = 'UPDATE' AND value->pair[2] IS DISTINCT FROM previous->pair[2]
          AND value->pair[1] IS NOT DISTINCT FROM previous->pair[1] THEN
          value := jsonb_set(value, ARRAY[pair[1]], value->pair[2]);
        ELSIF TG_OP = 'UPDATE' AND value->pair[1] IS DISTINCT FROM previous->pair[1]
          AND value->pair[2] IS NOT DISTINCT FROM previous->pair[2] THEN
          value := jsonb_set(value, ARRAY[pair[2]], value->pair[1]);
        ELSIF value->>pair[1] IS NULL THEN
          value := jsonb_set(value, ARRAY[pair[1]], value->pair[2]);
        ELSIF value->>pair[2] IS NULL THEN
          value := jsonb_set(value, ARRAY[pair[2]], value->pair[1]);
        ELSIF value->>pair[1] IS DISTINCT FROM value->>pair[2] THEN
          RAISE EXCEPTION 'Conflicting academic record fields: % and %', pair[1], pair[2] USING ERRCODE = '23514';
        END IF;
      END IF;
    END LOOP;
    NEW := jsonb_populate_record(NEW, value);
    RETURN NEW;
  END $$;
  ${academicAliases.map(table => `
    DROP TRIGGER IF EXISTS sidebar_academic_contract ON ${table};
    CREATE TRIGGER sidebar_academic_contract BEFORE INSERT OR UPDATE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION sync_sidebar_academic_contract();
  `).join('\n')}

  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS request_number text;
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS department text;
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS requested_by text;
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS needed_by date;
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS lines jsonb NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS notes text;
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS approved_by_user_id uuid;
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
  ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
  UPDATE inventory_requests request SET
    request_number = COALESCE(request.request_number, 'REQ-' || request.id::text),
    requested_by = COALESCE(request.requested_by, to_jsonb(request)->>'requested_by_user_id'),
    notes = COALESCE(request.notes, to_jsonb(request)->>'reason');
  ALTER TABLE inventory_stock_movements ADD COLUMN IF NOT EXISTS item_id text;
  UPDATE inventory_stock_movements movement SET item_id = to_jsonb(movement)->>'inventory_item_id'
    WHERE item_id IS NULL;
  ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'reported';
  ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS code text;
  ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS zone text;
  UPDATE transport_routes route SET code = to_jsonb(route)->>'route_code' WHERE code IS NULL;
  ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS make text;
  ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS model text;
  ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS insurance_expiry_date date;
  ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS service_due_date date;
  ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
  ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS actual_end_at timestamptz;
  ALTER TABLE transport_manifest_students ADD COLUMN IF NOT EXISTS pickup_stop_id uuid;
  ALTER TABLE transport_manifest_students ADD COLUMN IF NOT EXISTS guardian_contact text;
  ALTER TABLE transport_route_stops ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
  ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS category_name text;
  UPDATE inventory_categories category SET category_name = to_jsonb(category)->>'name' WHERE category_name IS NULL;
  ALTER TABLE boarding_houses ADD COLUMN IF NOT EXISTS title text;
  ALTER TABLE boarding_houses ADD COLUMN IF NOT EXISTS category text;
  UPDATE boarding_houses house SET title = to_jsonb(house)->>'name' WHERE title IS NULL;
  ALTER TABLE assets ADD COLUMN IF NOT EXISTS title text;
  ALTER TABLE assets ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  UPDATE assets asset SET title = to_jsonb(asset)->>'name' WHERE title IS NULL;
  ALTER TABLE library_fines ADD COLUMN IF NOT EXISTS borrower_id uuid;
  ALTER TABLE library_fines ADD COLUMN IF NOT EXISTS copy_id uuid;
  ALTER TABLE library_fines ADD COLUMN IF NOT EXISTS amount_minor bigint;
  ALTER TABLE library_fines ADD COLUMN IF NOT EXISTS billing_reference text;
  UPDATE library_fines fine SET amount_minor = ROUND((to_jsonb(fine)->>'amount')::numeric * 100)::bigint
    WHERE amount_minor IS NULL AND to_jsonb(fine)->>'amount' IS NOT NULL;
  ALTER TABLE admission_interviews ADD COLUMN IF NOT EXISTS recommendation text;
  ALTER TABLE admission_interviews ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
  ALTER TABLE admission_interviews ADD COLUMN IF NOT EXISTS interview_date date;
  ALTER TABLE admission_interviews ADD COLUMN IF NOT EXISTS start_time time;
  ALTER TABLE admission_interviews ADD COLUMN IF NOT EXISTS end_time time;
  ALTER TABLE admission_interviews ADD COLUMN IF NOT EXISTS location text;
  ALTER TABLE admission_interviews ADD COLUMN IF NOT EXISTS assessment_type text;
  UPDATE admission_interviews SET interview_date = scheduled_at::date, start_time = scheduled_at::time
    WHERE interview_date IS NULL AND scheduled_at IS NOT NULL;
  UPDATE admission_interviews SET scheduled_at = interview_date + COALESCE(start_time, '00:00'::time)
    WHERE scheduled_at IS NULL AND interview_date IS NOT NULL;
  CREATE OR REPLACE FUNCTION sync_sidebar_interview_schedule() RETURNS trigger
  LANGUAGE plpgsql AS $$
  BEGIN
    IF NEW.scheduled_at IS NULL OR (TG_OP = 'UPDATE' AND
      (NEW.interview_date IS DISTINCT FROM OLD.interview_date OR NEW.start_time IS DISTINCT FROM OLD.start_time)
      AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at) THEN
      NEW.scheduled_at := NEW.interview_date + COALESCE(NEW.start_time, '00:00'::time);
    ELSE
      NEW.interview_date := NEW.scheduled_at::date;
      NEW.start_time := NEW.scheduled_at::time;
    END IF;
    RETURN NEW;
  END $$;
  DROP TRIGGER IF EXISTS sidebar_interview_schedule ON admission_interviews;
  CREATE TRIGGER sidebar_interview_schedule BEFORE INSERT OR UPDATE ON admission_interviews
    FOR EACH ROW EXECUTE FUNCTION sync_sidebar_interview_schedule();

  CREATE OR REPLACE FUNCTION sync_sidebar_field_aliases() RETURNS trigger
  LANGUAGE plpgsql AS $$
  DECLARE
    value jsonb := to_jsonb(NEW);
    previous jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
    lhs text; rhs text; position integer := 0;
  BEGIN
    WHILE position < TG_NARGS LOOP
      lhs := TG_ARGV[position]; rhs := TG_ARGV[position + 1];
      IF value ? lhs AND value ? rhs THEN
        IF TG_OP = 'UPDATE' AND value->lhs IS DISTINCT FROM previous->lhs THEN
          value := jsonb_set(value, ARRAY[rhs], value->lhs);
        ELSIF TG_OP = 'UPDATE' AND value->rhs IS DISTINCT FROM previous->rhs THEN
          value := jsonb_set(value, ARRAY[lhs], value->rhs);
        ELSIF value->>lhs IS NULL THEN
          value := jsonb_set(value, ARRAY[lhs], value->rhs);
        ELSIF value->>rhs IS NULL THEN
          value := jsonb_set(value, ARRAY[rhs], value->lhs);
        END IF;
      END IF;
      position := position + 2;
    END LOOP;
    NEW := jsonb_populate_record(NEW, value);
    RETURN NEW;
  END $$;
  ${fieldAliases.map(([table, ...fields]) => `
    DROP TRIGGER IF EXISTS sidebar_field_aliases ON ${table};
    CREATE TRIGGER sidebar_field_aliases BEFORE INSERT OR UPDATE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION sync_sidebar_field_aliases(${fields.map(field => `'${field}'`).join(', ')});
  `).join('\n')}
  ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

  DO $$ BEGIN
    IF to_regclass('public.student_attendance_logs') IS NULL THEN
      EXECUTE $view$
        CREATE VIEW student_attendance_logs WITH (security_invoker = true) AS
        SELECT record.id::text, record.tenant_id::text, record.student_id::text,
          COALESCE(to_jsonb(record)->>'class_id', (SELECT session.class_id FROM attendance_sessions session
            WHERE session.id::text = record.attendance_session_id::text AND session.school_id = record.school_id)) AS class_id,
          record.attendance_date, lower(record.status::text) AS status,
          to_jsonb(record)->>'reason' AS reason, record.created_at
        FROM attendance_records record
        UNION ALL
        SELECT live.id::text, live.tenant_id::text, live.student_id::text,
          live.class_id::text, live.attendance_date::date, lower(live.status::text),
          to_jsonb(live)->>'reason', live.created_at
        FROM academics_attendance live
        WHERE NOT EXISTS (SELECT 1 FROM attendance_records record
          WHERE record.tenant_id::text = live.tenant_id::text
            AND record.student_id::text = live.student_id::text
            AND record.attendance_date = live.attendance_date::date)
      $view$;
    END IF;
    IF to_regclass('public.timetable_lessons') IS NULL THEN
      EXECUTE $view$
        CREATE VIEW timetable_lessons WITH (security_invoker = true) AS
        SELECT slot.id, slot.tenant_id, slot.class_section_id AS stream_id,
          slot.day_of_week AS weekday, slot.starts_at, slot.ends_at,
          slot.room_id AS room_label, slot.period_id::text AS period_number,
          offering.id AS class_subject_assignment_id, slot.created_at, slot.updated_at
        FROM timetable_slots slot
        LEFT JOIN LATERAL (SELECT assignment.id FROM class_subject_assignments assignment
          WHERE assignment.tenant_id = slot.tenant_id
            AND assignment.class_section_id::text = slot.class_section_id::text
            AND assignment.subject_id::text = slot.subject_id::text AND assignment.status = 'active'
          ORDER BY assignment.updated_at DESC LIMIT 1) offering ON TRUE
      $view$;
    END IF;
    IF to_regclass('public.lesson_substitutions') IS NULL THEN
      EXECUTE $view$
        CREATE VIEW lesson_substitutions WITH (security_invoker = true) AS
        SELECT id, tenant_id, slot_id AS lesson_id, absent_teacher_id,
          substitute_teacher_id AS assigned_teacher_id, status, reason, created_at, updated_at
        FROM timetable_relief_assignments
      $view$;
    END IF;
  END $$;

  ${scopedTables.map(table => `
    ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS ${table}_sidebar_tenant_policy ON ${table};
    CREATE POLICY ${table}_sidebar_tenant_policy ON ${table}
      USING (tenant_id::text = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE INDEX IF NOT EXISTS ix_${table}_sidebar_tenant ON ${table} (tenant_id);
  `).join('\n')}
`;
