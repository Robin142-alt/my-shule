/**
 * Additive extension of the existing catalogue and append-only circulation ledger.
 * Bootstrap runs under the existing serialized, transactional schema migration lock.
 * Collisions stop this migration; operators must review them, never rewrite history.
 */
export const SMART_LIBRARY_SCHEMA_SQL = `
CREATE SEQUENCE IF NOT EXISTS library_barcode_sequence AS bigint MINVALUE 1 NO CYCLE;

CREATE TABLE IF NOT EXISTS library_barcode_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
  quantity integer NOT NULL CHECK(quantity > 0), source text NOT NULL,
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS library_barcode_registry (
  barcode text PRIMARY KEY,
  tenant_id text NOT NULL, batch_id uuid, ordinal integer,
  encoding_version text NOT NULL DEFAULT 'decimal-v1',
  copy_id uuid, retired_at timestamptz,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
  assigned_at timestamptz,
  UNIQUE(tenant_id,barcode),
  FOREIGN KEY(tenant_id,batch_id) REFERENCES library_barcode_batches(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS ix_library_barcode_batch ON library_barcode_registry(tenant_id,batch_id,ordinal);
CREATE INDEX IF NOT EXISTS ix_library_barcode_unused ON library_barcode_registry(tenant_id,created_at,barcode) WHERE copy_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_library_barcode_copy ON library_barcode_registry(tenant_id,copy_id) WHERE copy_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS library_commands (
  tenant_id text NOT NULL, request_id uuid NOT NULL, kind text NOT NULL,
  request_hash text NOT NULL, result jsonb NOT NULL,
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,request_id)
);
ALTER TABLE library_catalog_items ADD COLUMN IF NOT EXISTS publisher text;
ALTER TABLE library_copies ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'good';
ALTER TABLE library_copies DROP CONSTRAINT IF EXISTS library_copies_status_check;
ALTER TABLE library_copies ADD CONSTRAINT library_copies_status_check
  CHECK(status IN ('available','issued','reserved','lost','damaged','retired'));
CREATE UNIQUE INDEX IF NOT EXISTS ux_library_copy_scope ON library_copies(tenant_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_library_borrower_scope ON library_borrowers(tenant_id,id);
CREATE INDEX IF NOT EXISTS ix_library_borrower_subject ON library_borrowers(tenant_id,borrower_type,subject_id);

-- Prisma-era ledgers require updated_at without a database default. Supply
-- future inserts while preserving the append-only history and existing values.
ALTER TABLE library_circulation_ledger ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE library_circulation_ledger ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE library_reservations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE library_reservations ALTER COLUMN updated_at SET DEFAULT now();

-- Production has the original Prisma fine table, while newer installations
-- have the circulation table. Extend both without discarding old finance links.
ALTER TABLE library_fines
  ADD COLUMN IF NOT EXISTS school_id text,
  ADD COLUMN IF NOT EXISTS borrower_id uuid,
  ADD COLUMN IF NOT EXISTS copy_id uuid,
  ADD COLUMN IF NOT EXISTS amount_minor integer,
  ADD COLUMN IF NOT EXISTS billing_reference text,
  ADD COLUMN IF NOT EXISTS library_loan_id text,
  ADD COLUMN IF NOT EXISTS student_id text,
  ADD COLUMN IF NOT EXISTS amount double precision,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE library_fines ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE library_fines ALTER COLUMN library_loan_id DROP NOT NULL;
ALTER TABLE library_fines ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE library_fines ALTER COLUMN status SET DEFAULT 'UNPAID';
ALTER TABLE library_fines ALTER COLUMN updated_at SET DEFAULT now();
UPDATE library_fines SET amount_minor=round(amount*100)::integer WHERE amount_minor IS NULL AND amount IS NOT NULL;
CREATE OR REPLACE FUNCTION library_fine_compatibility() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.school_id=COALESCE(NEW.school_id,NEW.tenant_id);
  IF NEW.amount_minor IS NOT NULL THEN NEW.amount=NEW.amount_minor/100.0; END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS library_fine_compatibility ON library_fines;
CREATE TRIGGER library_fine_compatibility BEFORE INSERT ON library_fines
FOR EACH ROW EXECUTE FUNCTION library_fine_compatibility();

DO $migration$
BEGIN
  IF EXISTS(SELECT barcode FROM library_copies WHERE barcode IS NOT NULL GROUP BY barcode HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Library barcode migration blocked: existing global collisions need reviewed relabelling. No historical data changed.';
  END IF;
END $migration$;
INSERT INTO library_barcode_registry(barcode,tenant_id,copy_id,assigned_at,encoding_version)
SELECT barcode,tenant_id,id,created_at,'legacy'
FROM library_copies WHERE barcode IS NOT NULL
ON CONFLICT(barcode) DO NOTHING;

CREATE OR REPLACE FUNCTION library_permanent_barcode() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Library barcode reservations are permanent'; END IF;
  IF NEW.barcode IS DISTINCT FROM OLD.barcode OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.batch_id IS DISTINCT FROM OLD.batch_id
     OR (OLD.copy_id IS NOT NULL AND NEW.copy_id IS DISTINCT FROM OLD.copy_id)
     OR (OLD.retired_at IS NOT NULL AND NEW.retired_at IS DISTINCT FROM OLD.retired_at) THEN
    RAISE EXCEPTION 'Library barcode identity and ownership are immutable';
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS library_barcode_permanence ON library_barcode_registry;
CREATE TRIGGER library_barcode_permanence BEFORE UPDATE OR DELETE ON library_barcode_registry
FOR EACH ROW EXECUTE FUNCTION library_permanent_barcode();

CREATE OR REPLACE FUNCTION library_copy_barcode_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE owner_copy uuid; owner_retired timestamptz;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Retire library copies instead of deleting their history';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR (OLD.barcode IS NOT NULL AND NEW.barcode IS DISTINCT FROM OLD.barcode)) THEN
    RAISE EXCEPTION 'Assigned library barcodes cannot be changed';
  END IF;
  IF NEW.barcode IS NOT NULL THEN
    INSERT INTO library_barcode_registry(barcode,tenant_id,copy_id,assigned_at,encoding_version)
      VALUES(NEW.barcode,NEW.tenant_id,NEW.id,now(),'external-v1') ON CONFLICT DO NOTHING;
    SELECT copy_id,retired_at INTO owner_copy,owner_retired FROM library_barcode_registry
      WHERE tenant_id=NEW.tenant_id AND barcode=NEW.barcode FOR UPDATE;
    IF NOT FOUND OR owner_retired IS NOT NULL OR (owner_copy IS NOT NULL AND owner_copy <> NEW.id) THEN
      IF NOT (TG_OP='UPDATE' AND NEW.status='retired' AND OLD.status='retired') THEN
        RAISE EXCEPTION 'Barcode is unavailable for this physical copy';
      END IF;
    END IF;
    UPDATE library_barcode_registry SET copy_id=NEW.id,assigned_at=COALESCE(assigned_at,now()),
      retired_at=CASE WHEN NEW.status='retired' THEN COALESCE(retired_at,now()) ELSE retired_at END
      WHERE tenant_id=NEW.tenant_id AND barcode=NEW.barcode;
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS library_copy_barcode_guard ON library_copies;
CREATE TRIGGER library_copy_barcode_guard BEFORE INSERT OR UPDATE OR DELETE ON library_copies
FOR EACH ROW EXECUTE FUNCTION library_copy_barcode_guard();

CREATE TABLE IF NOT EXISTS library_copy_loans (
  id uuid PRIMARY KEY, tenant_id text NOT NULL,
  copy_id uuid NOT NULL, borrower_id uuid NOT NULL,
  issued_at timestamptz NOT NULL, due_on date,
  issued_by uuid, returned_at timestamptz, returned_by uuid,
  return_condition text, return_event_id uuid,
  FOREIGN KEY(tenant_id,copy_id) REFERENCES library_copies(tenant_id,id),
  FOREIGN KEY(tenant_id,borrower_id) REFERENCES library_borrowers(tenant_id,id)
);
-- Preserve each historical issue. Historical returns are matched exactly as the
-- existing library did; new returns always carry an explicit loan_id.
INSERT INTO library_copy_loans(id,tenant_id,copy_id,borrower_id,issued_at,due_on,issued_by,
  returned_at,returned_by,return_condition,return_event_id)
SELECT i.id,i.tenant_id,i.copy_id,i.borrower_id,i.created_at,
  CASE WHEN i.metadata->>'due_on' ~ '^\\d{4}-\\d{2}-\\d{2}' THEN (i.metadata->>'due_on')::date END,
  CASE WHEN i.metadata->>'issued_by_user_id' ~ '^[0-9a-fA-F-]{36}$' THEN (i.metadata->>'issued_by_user_id')::uuid END,
  r.created_at,
  CASE WHEN r.metadata->>'returned_by_user_id' ~ '^[0-9a-fA-F-]{36}$' THEN (r.metadata->>'returned_by_user_id')::uuid END,
  r.metadata->>'condition',r.id
FROM library_circulation_ledger i
JOIN library_copies c ON c.tenant_id=i.tenant_id AND c.id=i.copy_id
JOIN library_borrowers b ON b.tenant_id=i.tenant_id AND b.id=i.borrower_id
LEFT JOIN LATERAL (
  SELECT r.* FROM library_circulation_ledger r
  WHERE r.tenant_id=i.tenant_id AND r.copy_id=i.copy_id AND r.borrower_id=i.borrower_id
    AND r.action='return' AND r.created_at>=i.created_at
    AND (r.metadata->>'loan_id' IS NULL OR r.metadata->>'loan_id'=i.id::text)
  ORDER BY r.created_at,r.id LIMIT 1
) r ON true
WHERE i.action='issue'
ON CONFLICT(id) DO NOTHING;
CREATE UNIQUE INDEX IF NOT EXISTS ux_library_one_active_loan ON library_copy_loans(tenant_id,copy_id) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_library_loan_borrower ON library_copy_loans(tenant_id,borrower_id,issued_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_library_loan_overdue ON library_copy_loans(tenant_id,due_on) WHERE returned_at IS NULL;

CREATE OR REPLACE FUNCTION library_project_circulation() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE affected integer;
BEGIN
  IF NEW.action='issue' THEN
    INSERT INTO library_copy_loans(id,tenant_id,copy_id,borrower_id,issued_at,due_on,issued_by)
    VALUES(NEW.id,NEW.tenant_id,NEW.copy_id,NEW.borrower_id,NEW.created_at,
      (NEW.metadata->>'due_on')::date,(NEW.metadata->>'issued_by_user_id')::uuid);
  ELSIF NEW.action='return' THEN
    UPDATE library_copy_loans SET returned_at=NEW.created_at,
      returned_by=(NEW.metadata->>'returned_by_user_id')::uuid,
      return_condition=NEW.metadata->>'condition',return_event_id=NEW.id
    WHERE tenant_id=NEW.tenant_id AND copy_id=NEW.copy_id AND borrower_id=NEW.borrower_id
      AND returned_at IS NULL
      AND (NEW.metadata->>'loan_id' IS NULL OR id::text=NEW.metadata->>'loan_id');
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION 'No single active loan exists for this return'; END IF;
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS library_project_circulation ON library_circulation_ledger;
CREATE TRIGGER library_project_circulation AFTER INSERT ON library_circulation_ledger
FOR EACH ROW EXECUTE FUNCTION library_project_circulation();

CREATE TABLE IF NOT EXISTS library_stocktakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
  name text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','completed')),
  created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS library_stocktake_items (
  tenant_id text NOT NULL, session_id uuid NOT NULL, copy_id uuid NOT NULL,
  expected_status text NOT NULL, verified_at timestamptz,
  PRIMARY KEY(tenant_id,session_id,copy_id),
  FOREIGN KEY(tenant_id,session_id) REFERENCES library_stocktakes(tenant_id,id),
  FOREIGN KEY(tenant_id,copy_id) REFERENCES library_copies(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS library_stocktake_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
  session_id uuid NOT NULL, barcode text NOT NULL, copy_id uuid,
  outcome text NOT NULL, scanned_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,session_id,barcode),
  FOREIGN KEY(tenant_id,session_id) REFERENCES library_stocktakes(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS library_copy_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
  copy_id uuid NOT NULL, action text NOT NULL, reason text NOT NULL,
  actor_user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  replacement_copy_id uuid,
  FOREIGN KEY(tenant_id,copy_id) REFERENCES library_copies(tenant_id,id),
  FOREIGN KEY(tenant_id,replacement_copy_id) REFERENCES library_copies(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS ix_library_incident_copy ON library_copy_incidents(tenant_id,copy_id,created_at);
${['library_barcode_batches','library_barcode_registry','library_commands','library_copy_loans',
  'library_stocktakes','library_stocktake_items','library_stocktake_scans','library_copy_incidents'].map(table => `
ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ${table}_school_policy ON ${table};
CREATE POLICY ${table}_school_policy ON ${table} FOR ALL
USING(tenant_id=current_setting('app.tenant_id',true))
WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
`).join('\n')}
`;
