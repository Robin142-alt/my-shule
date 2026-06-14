const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'apps', 'api', 'src', 'database', 'schema.sql');
const sql = `
-- More Missing Schemas: Exams, Admin, Communication

CREATE TABLE IF NOT EXISTS exam_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_mark_entry_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exam_series_id UUID NOT NULL REFERENCES exam_series(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  opens_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closes_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exam_series_id UUID NOT NULL REFERENCES exam_series(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_readiness_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exam_series_id UUID NOT NULL REFERENCES exam_series(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communication_sms_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'reported',
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE exam_series FORCE ROW LEVEL SECURITY;
ALTER TABLE exam_mark_entry_windows FORCE ROW LEVEL SECURITY;
ALTER TABLE exam_marks FORCE ROW LEVEL SECURITY;
ALTER TABLE report_readiness_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE communication_sms_outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_incidents FORCE ROW LEVEL SECURITY;
`;

fs.appendFileSync(schemaPath, sql);
console.log('Appended additional missing schemas to schema.sql');
