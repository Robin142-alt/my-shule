const fs = require('fs');
const filePath = 'apps/api/src/modules/admissions/admissions-schema.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const tablesString = `
      CREATE TABLE IF NOT EXISTS admission_enquiries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        enquiry_code text NOT NULL,
        student_first_name text NOT NULL,
        student_last_name text NOT NULL,
        parent_name text NOT NULL,
        parent_phone text NOT NULL,
        parent_email text,
        class_applying text,
        enquiry_source text,
        boarding_day_preference text,
        current_school text,
        location text,
        notes text,
        follow_up_date date,
        status text NOT NULL DEFAULT 'open',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_enquiries_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS admission_interviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        application_id uuid NOT NULL,
        interview_date date NOT NULL,
        start_time text NOT NULL,
        end_time text NOT NULL,
        location text,
        interviewer_user_id uuid,
        assessment_type text,
        reading_score integer,
        writing_score integer,
        mathematics_score integer,
        general_conduct text,
        recommendation text,
        interviewer_comment text,
        status text NOT NULL DEFAULT 'scheduled',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_interviews_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_interviews_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admission_offers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        application_id uuid NOT NULL,
        offer_status text NOT NULL DEFAULT 'pending',
        required_deposit bigint,
        deposit_paid bigint DEFAULT 0,
        offer_date date NOT NULL DEFAULT CURRENT_DATE,
        deadline_date date,
        finance_cleared boolean NOT NULL DEFAULT FALSE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_offers_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_offers_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admission_appointments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        application_id uuid,
        visitor_name text NOT NULL,
        purpose text NOT NULL,
        appointment_date date NOT NULL,
        start_time text NOT NULL,
        assigned_user_id uuid,
        status text NOT NULL DEFAULT 'scheduled',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_appointments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_appointments_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admission_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        application_id uuid,
        task_title text NOT NULL,
        task_description text,
        due_date date,
        priority text NOT NULL DEFAULT 'medium',
        assigned_user_id uuid,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_tasks_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_tasks_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admission_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        template_name text NOT NULL,
        template_type text NOT NULL,
        content text NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_templates_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE INDEX IF NOT EXISTS ix_admission_applications_status ON admission_applications (tenant_id, status, created_at DESC);`;

const indexesAndRlsTarget = `      ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;`;
const rlsString = `
      ALTER TABLE admission_enquiries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_enquiries FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_interviews ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_interviews FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_offers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_offers FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_appointments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_appointments FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_tasks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_tasks FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_templates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_templates FORCE ROW LEVEL SECURITY;
      
      ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;`;

const policiesTarget = `      DROP TRIGGER IF EXISTS trg_admission_applications_set_updated_at ON admission_applications;`;
const policiesString = `
      DROP POLICY IF EXISTS admission_enquiries_rls_policy ON admission_enquiries;
      CREATE POLICY admission_enquiries_rls_policy ON admission_enquiries
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_interviews_rls_policy ON admission_interviews;
      CREATE POLICY admission_interviews_rls_policy ON admission_interviews
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_offers_rls_policy ON admission_offers;
      CREATE POLICY admission_offers_rls_policy ON admission_offers
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_appointments_rls_policy ON admission_appointments;
      CREATE POLICY admission_appointments_rls_policy ON admission_appointments
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_tasks_rls_policy ON admission_tasks;
      CREATE POLICY admission_tasks_rls_policy ON admission_tasks
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_templates_rls_policy ON admission_templates;
      CREATE POLICY admission_templates_rls_policy ON admission_templates
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP TRIGGER IF EXISTS trg_admission_applications_set_updated_at ON admission_applications;`;

const triggersTarget = `    \`);`;
const triggersString = `
      DROP TRIGGER IF EXISTS trg_admission_enquiries_set_updated_at ON admission_enquiries;
      CREATE TRIGGER trg_admission_enquiries_set_updated_at
      BEFORE UPDATE ON admission_enquiries
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_interviews_set_updated_at ON admission_interviews;
      CREATE TRIGGER trg_admission_interviews_set_updated_at
      BEFORE UPDATE ON admission_interviews
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_offers_set_updated_at ON admission_offers;
      CREATE TRIGGER trg_admission_offers_set_updated_at
      BEFORE UPDATE ON admission_offers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_appointments_set_updated_at ON admission_appointments;
      CREATE TRIGGER trg_admission_appointments_set_updated_at
      BEFORE UPDATE ON admission_appointments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_tasks_set_updated_at ON admission_tasks;
      CREATE TRIGGER trg_admission_tasks_set_updated_at
      BEFORE UPDATE ON admission_tasks
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_templates_set_updated_at ON admission_templates;
      CREATE TRIGGER trg_admission_templates_set_updated_at
      BEFORE UPDATE ON admission_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    \`);`;

content = content.replace("      CREATE INDEX IF NOT EXISTS ix_admission_applications_status ON admission_applications (tenant_id, status, created_at DESC);", tablesString);
content = content.replace(indexesAndRlsTarget, rlsString);
content = content.replace(policiesTarget, policiesString);
content = content.replace(triggersTarget, triggersString);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Schema updated.');
