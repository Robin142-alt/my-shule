import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuthSchemaService } from '../../auth/auth-schema.service';
import { LEGAL_DOCUMENTS } from '../../../../../shared/legal/documents';
import { DPA_RELEASE, isDpaActive } from '../../../../../shared/legal/release';
import { createHash } from 'node:crypto';

@Injectable()
export class LegalSchemaService implements OnModuleInit {
  constructor(private readonly database: DatabaseService, private readonly authSchema: AuthSchemaService) {}

  async onModuleInit() {
    if (DPA_RELEASE.approval && (!isDpaActive() || !LEGAL_DOCUMENTS.some((doc) => doc.id === DPA_RELEASE.documentId && doc.kind === 'dpa') || [DPA_RELEASE.approval.productionRegister, DPA_RELEASE.approval.retentionSchedule].some((doc) => createHash('sha256').update(doc.content).digest('hex') !== doc.sha256))) throw new Error('DPA approval evidence is incomplete or its schedules have changed.');
    await this.authSchema.onModuleInit();
    await this.database.runSchemaBootstrap(LEGAL_SCHEMA_SQL);
    for (const document of LEGAL_DOCUMENTS) {
      if (createHash('sha256').update(document.content).digest('hex') !== document.sha256) throw new Error(`Legal document ${document.id} failed its integrity check.`);
      await this.database.query(`INSERT INTO legal_documents (id, kind, version, generation, content_hash, content, effective_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7::date) ON CONFLICT (id) DO NOTHING`,
      [document.id, document.kind, document.version, document.generation, document.sha256, document.content, document.effectiveDate]);
      const stored = await this.database.query('SELECT content_hash, content, generation, kind, version, effective_date::text FROM legal_documents WHERE id = $1', [document.id]);
      if (stored.rows[0]?.content_hash !== document.sha256 || stored.rows[0]?.content !== document.content || stored.rows[0]?.generation !== document.generation || stored.rows[0]?.kind !== document.kind || stored.rows[0]?.version !== document.version || stored.rows[0]?.effective_date !== document.effectiveDate) {
        throw new Error(`Immutable legal document ${document.id} has changed. Publish a new version.`);
      }
    }
  }
}

export const LEGAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS legal_documents (
 id text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('terms','privacy','dpa')),
 version text NOT NULL, generation integer NOT NULL CHECK (generation > 0),
 content_hash text NOT NULL CHECK (length(content_hash) = 64), content text NOT NULL,
 effective_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW(),
 UNIQUE(kind, version), UNIQUE(id, kind, generation)
);
CREATE TABLE IF NOT EXISTS legal_authorities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('school','guardian')), user_id uuid NOT NULL REFERENCES users(id),
 student_id text NOT NULL DEFAULT '', guardian_link_id uuid,
 evidence_reference text NOT NULL CHECK (length(btrim(evidence_reference)) BETWEEN 8 AND 500),
 verified_by uuid NOT NULL REFERENCES users(id), verified_at timestamptz NOT NULL DEFAULT NOW(),
 revoked_at timestamptz, revoked_by uuid REFERENCES users(id),
 CHECK (user_id <> verified_by), CHECK ((kind = 'school' AND student_id = '' AND guardian_link_id IS NULL) OR (kind = 'guardian' AND student_id <> '' AND guardian_link_id IS NOT NULL)),
 UNIQUE(tenant_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_legal_authorities_active ON legal_authorities(tenant_id, kind, user_id, student_id) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS legal_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
 user_id uuid NOT NULL REFERENCES users(id), scope text NOT NULL CHECK (scope IN ('individual','school','guardian')),
 subject_id text NOT NULL, document_id text NOT NULL, kind text NOT NULL, generation integer NOT NULL,
 authority_id uuid, accepted_at timestamptz NOT NULL DEFAULT NOW(),
 actor_role text NOT NULL, session_id text NOT NULL, request_id text NOT NULL,
 statement text NOT NULL, evidence jsonb NOT NULL DEFAULT '{}',
 FOREIGN KEY (document_id, kind, generation) REFERENCES legal_documents(id, kind, generation),
 FOREIGN KEY (tenant_id, authority_id) REFERENCES legal_authorities(tenant_id, id),
 CHECK ((scope = 'individual' AND authority_id IS NULL AND subject_id = user_id::text AND kind IN ('terms','privacy')) OR
        (scope = 'school' AND authority_id IS NOT NULL AND subject_id = tenant_id AND kind = 'dpa') OR
        (scope = 'guardian' AND authority_id IS NOT NULL AND kind IN ('terms','privacy'))),
 CONSTRAINT legal_acceptance_subject_not_blank CHECK (btrim(subject_id) <> '')
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_legal_individual ON legal_acceptances(user_id,kind,generation) WHERE scope='individual';
CREATE UNIQUE INDEX IF NOT EXISTS ux_legal_school ON legal_acceptances(tenant_id,kind,generation) WHERE scope='school';
CREATE UNIQUE INDEX IF NOT EXISTS ux_legal_guardian ON legal_acceptances(tenant_id,subject_id,kind,generation,authority_id) WHERE scope='guardian';
CREATE INDEX IF NOT EXISTS ix_legal_school_acceptance ON legal_acceptances(tenant_id, scope, kind, generation);
CREATE INDEX IF NOT EXISTS ix_legal_actor_receipts ON legal_acceptances(user_id,accepted_at DESC);
CREATE TABLE IF NOT EXISTS legal_guardian_withdrawals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL, user_id uuid NOT NULL REFERENCES users(id),
 student_id text NOT NULL, withdrawn_at timestamptz NOT NULL DEFAULT NOW(), request_id text NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_legal_guardian_withdrawals ON legal_guardian_withdrawals(tenant_id, student_id, user_id, withdrawn_at DESC);
CREATE OR REPLACE FUNCTION legal_immutable_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Legal evidence is append-only'; END; $$;
DROP TRIGGER IF EXISTS legal_documents_immutable ON legal_documents;
CREATE TRIGGER legal_documents_immutable BEFORE UPDATE OR DELETE ON legal_documents FOR EACH ROW EXECUTE FUNCTION legal_immutable_evidence();
DROP TRIGGER IF EXISTS legal_acceptances_immutable ON legal_acceptances;
CREATE TRIGGER legal_acceptances_immutable BEFORE UPDATE OR DELETE ON legal_acceptances FOR EACH ROW EXECUTE FUNCTION legal_immutable_evidence();
DROP TRIGGER IF EXISTS legal_withdrawals_immutable ON legal_guardian_withdrawals;
CREATE TRIGGER legal_withdrawals_immutable BEFORE UPDATE OR DELETE ON legal_guardian_withdrawals FOR EACH ROW EXECUTE FUNCTION legal_immutable_evidence();
CREATE OR REPLACE FUNCTION legal_authority_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.revoked_at IS NOT NULL OR
   (to_jsonb(NEW) - 'revoked_at' - 'revoked_by') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at' - 'revoked_by') OR
   NEW.revoked_at IS NULL OR NEW.revoked_by IS NULL THEN RAISE EXCEPTION 'Legal authority evidence is append-only except for revocation'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS legal_authorities_immutable ON legal_authorities;
CREATE TRIGGER legal_authorities_immutable BEFORE UPDATE OR DELETE ON legal_authorities FOR EACH ROW EXECUTE FUNCTION legal_authority_evidence();
-- Minimal identity projection for legal checks across a person's school memberships.
-- Never expose credentials or unrelated users. Existing users RLS remains unchanged.
CREATE OR REPLACE FUNCTION app.legal_identity(input_user_id uuid, lock_row boolean DEFAULT false)
 RETURNS TABLE(id uuid, display_name text, user_type text, status text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE actor uuid; school text; BEGIN
 actor := NULLIF(NULLIF(current_setting('app.user_id',true),''),'anonymous')::uuid;
 school := current_setting('app.tenant_id',true);
 IF current_setting('app.is_authenticated',true) IS DISTINCT FROM 'true' OR actor IS NULL OR
   NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=actor AND u.status='active' AND
     (u.user_type='platform_owner' OR EXISTS(SELECT 1 FROM public.tenant_memberships m WHERE m.user_id=actor AND m.tenant_id=school AND m.status='active'))) THEN RETURN; END IF;
 IF input_user_id<>actor AND NOT EXISTS(SELECT 1 FROM public.tenant_memberships m WHERE m.user_id=input_user_id AND m.tenant_id=school AND m.status='active') THEN RETURN; END IF;
 IF lock_row THEN
   IF input_user_id<>actor AND NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=actor AND u.user_type='platform_owner') AND
     NOT EXISTS(SELECT 1 FROM public.legal_authorities a WHERE a.tenant_id=school AND a.user_id=actor AND a.kind='school' AND a.revoked_at IS NULL) THEN RETURN; END IF;
   RETURN QUERY SELECT u.id,u.display_name,u.user_type,u.status FROM public.users u WHERE u.id=input_user_id AND u.status='active' FOR UPDATE;
 ELSE
   RETURN QUERY SELECT u.id,u.display_name,u.user_type,u.status FROM public.users u WHERE u.id=input_user_id AND u.status='active';
 END IF;
END; $$;
REVOKE ALL ON FUNCTION app.legal_identity(uuid,boolean) FROM PUBLIC;
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['legal_acceptances','legal_authorities','legal_guardian_withdrawals'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
  EXECUTE format('DROP POLICY IF EXISTS legal_tenant_policy ON %I', table_name);
  EXECUTE format('CREATE POLICY legal_tenant_policy ON %I FOR ALL USING (tenant_id = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true))', table_name);
 END LOOP;
END $$;
-- Individual agreements follow the authenticated identity across memberships. School and
-- guardian evidence remains school-scoped. The tenant on an individual receipt is its origin.
DROP POLICY IF EXISTS legal_tenant_policy ON legal_acceptances;
CREATE POLICY legal_tenant_policy ON legal_acceptances FOR ALL
 USING (tenant_id = current_setting('app.tenant_id', true) OR
   (scope = 'individual' AND user_id::text = current_setting('app.user_id', true)))
 WITH CHECK (tenant_id = current_setting('app.tenant_id', true) AND user_id::text = current_setting('app.user_id', true));
`;
