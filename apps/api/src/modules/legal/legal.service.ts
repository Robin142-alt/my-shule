import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LEGAL_DOCUMENTS } from '../../../../../shared/legal/documents';
import { DPA_RELEASE, isDpaActive } from '../../../../../shared/legal/release';
import { DatabaseService } from '../../database/database.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { needsGuardian, outstandingDocuments, validateSelections } from './legal-policy';

export interface LegalDocument {
  id: string; kind: string; title: string; version: string; generation: number;
  sha256: string; content: string; effectiveDate: string; effectiveDateStatus: string;
  sourceUrl?: string; sourceSha256?: string;
}
// Retain every published version in the catalogue. Only these IDs govern new acceptance.
export const currentDocuments: readonly LegalDocument[] = LEGAL_DOCUMENTS.filter((doc) => ['privacy-1.0', 'terms-1.0', 'dpa-2.0'].includes(doc.id));
const individualDocuments = () => currentDocuments.filter((doc) => doc.kind !== 'dpa');
const SCHOOL_STATEMENT = 'I am authorised to bind this school and accept the School Data Processing Agreement on its behalf.';
const GUARDIAN_STATEMENT = 'As the verified parent or guardian, I authorise this child to use the MyShule student portal under the linked Terms of Use and Privacy Policy. This authorisation does not consent to unrelated or optional processing.';

@Injectable()
export class LegalService {
  constructor(readonly database: DatabaseService, readonly context: RequestContextService) {}

  private identity() {
    const ctx = this.context.requireStore();
    if (!ctx.is_authenticated || !ctx.session_id || ctx.user_id === 'anonymous') throw new UnauthorizedException();
    if (!ctx.tenant_id) throw new ForbiddenException('A verified school or platform context is required.');
    return ctx;
  }

  private inLegalContext<T>(callback: () => Promise<T>) {
    const ctx = this.context.requireStore();
    // Platform sessions deliberately have no school. Give only legal persistence a
    // global scope; never change the surrounding authenticated request's tenant.
    return ctx.audience === 'superadmin' && ctx.tenant_id !== 'global'
      ? this.context.run({ ...ctx, tenant_id: 'global', db_client: undefined }, callback)
      : callback();
  }

  status(detailed = true) { return this.inLegalContext(() => this.buildStatus(detailed)); }

  private async buildStatus(detailed: boolean) {
    const ctx = this.identity();
    const identity = await this.database.query(`SELECT u.id, u.display_name, u.user_type, r.code AS membership_role
      FROM app.legal_identity($2::uuid) u LEFT JOIN tenant_memberships m ON m.user_id=u.id AND m.tenant_id=$1 AND m.status='active'
      LEFT JOIN roles r ON r.id=m.role_id AND r.tenant_id=m.tenant_id
      WHERE u.id=$2::uuid AND u.status='active'`, [ctx.tenant_id, ctx.user_id]);
    const person = identity.rows[0];
    const platform = ctx.audience === 'superadmin' && person?.user_type === 'platform_owner';
    if (!person || (!platform && !person.membership_role)) throw new ForbiddenException('An active school membership is required.');
    const accepted = await this.database.query(`SELECT a.id,a.document_id,a.kind,a.generation,a.scope,a.subject_id,a.accepted_at,d.version,d.content_hash FROM legal_acceptances a
      JOIN legal_documents d ON d.id=a.document_id WHERE a.user_id=$2::uuid AND (a.scope='individual' OR a.tenant_id=$1)
      ${detailed ? '' : "AND a.scope='individual'"} ORDER BY accepted_at DESC`, [ctx.tenant_id, ctx.user_id]);
    const required = outstandingDocuments(individualDocuments(), accepted.rows.filter((row) => row.scope === 'individual') as { kind: string; generation: number }[]);
    const authority = detailed || isDpaActive() ? await this.database.query(`SELECT id FROM legal_authorities WHERE tenant_id=$1 AND user_id=$2::uuid
      AND kind='school' AND revoked_at IS NULL`, [ctx.tenant_id, ctx.user_id]) : { rows: [] };
    const dpa = currentDocuments.find((doc) => doc.kind === 'dpa');
    const blockers: { code: string; message: string }[] = [];
    let schoolAccepted = platform;
    if (!platform && isDpaActive()) {
      const school = await this.database.query(`SELECT id FROM legal_acceptances WHERE tenant_id=$1 AND scope='school' AND kind='dpa' AND generation=$2 LIMIT 1`, [ctx.tenant_id, dpa?.generation ?? 0]);
      schoolAccepted = school.rows.length > 0;
      if (!dpa) blockers.push({ code: 'DPA_UNAVAILABLE', message: 'Your school agreement is awaiting publication by Orbitlane Technologies. Contact support, then retry.' });
      else if (!schoolAccepted && authority.rows.length) required.push(dpa);
      else if (!schoolAccepted) blockers.push({ code: 'SCHOOL_AGREEMENT_REQUIRED', message: 'A verified school representative must accept the school agreement. Please contact your school administrator.' });
    }
    // Resolve student identity independently of the active dashboard role.
    const student = await this.database.query(`SELECT s.id, s.date_of_birth::text FROM student_portal_access p
      JOIN students s ON s.tenant_id=p.tenant_id AND s.id=p.student_id AND s.deleted_at IS NULL
      WHERE p.tenant_id=$1 AND p.user_id=$2::uuid AND p.status='active'`, [ctx.tenant_id, ctx.user_id]);
    const studentIdentity = student.rows[0];
    if (person.membership_role === 'student' && !studentIdentity) throw new ForbiddenException('Your student account must be linked by your school.');
    const guardianRequired = Boolean(studentIdentity && needsGuardian(studentIdentity.date_of_birth));
    if (guardianRequired && !await this.hasGuardianAuthorisation(studentIdentity.id)) {
      blockers.push({ code: 'GUARDIAN_AUTHORISATION_REQUIRED', message: 'Your parent or guardian needs to authorise your portal access from their own verified account. Ask your school to verify their link, then retry.' });
    }
    const children = detailed ? await this.database.query(`SELECT s.id, s.first_name || ' ' || s.last_name AS name,
      s.date_of_birth::text, a.id AS authority_id FROM student_guardians g
      JOIN students s ON s.tenant_id=g.tenant_id AND s.id=g.student_id AND s.deleted_at IS NULL
      LEFT JOIN legal_authorities a ON a.tenant_id=g.tenant_id AND a.guardian_link_id=g.id::text AND a.user_id=g.user_id AND a.kind='guardian' AND a.revoked_at IS NULL
      WHERE g.tenant_id=$1 AND g.user_id=$2::uuid AND g.status='active' AND s.status='active'`, [ctx.tenant_id, ctx.user_id]) : { rows: [] };
    const guardianChildren = await Promise.all(children.rows.filter((child) => needsGuardian(child.date_of_birth)).map(async (child) => ({
      student_id: child.id as string, name: child.name as string, verified: Boolean(child.authority_id),
      authorised: await this.hasGuardianAuthorisation(child.id, ctx.user_id),
    })));
    const schoolName = detailed && !platform ? await this.database.query('SELECT name FROM tenants WHERE tenant_id=$1 LIMIT 1', [ctx.tenant_id]) : { rows: [] };
    const verificationSchools = detailed && platform ? await this.database.query("SELECT tenant_id AS id,name FROM tenants WHERE status='active' ORDER BY name") : { rows: [] };
    return {
      user_id: ctx.user_id, school_id: platform ? null : ctx.tenant_id, display_name: person.display_name,
      school_name: schoolName.rows[0]?.name ?? null,
      verification_schools: verificationSchools.rows,
      required_documents: required.map(({ content, ...doc }) => doc),
      documents: currentDocuments.map(({ content, ...doc }) => doc),
      blockers, ready: required.length === 0 && blockers.length === 0,
      school_accepted: schoolAccepted, school_authority_verified: authority.rows.length > 0,
      dpa_active: isDpaActive(),
      incorporated_documents: isDpaActive() && DPA_RELEASE.approval ? [DPA_RELEASE.approval.productionRegister, DPA_RELEASE.approval.retentionSchedule] : [],
      guardian_required: guardianRequired, guardian_children: guardianChildren,
      can_verify_school_authority: platform, can_verify_guardians: !platform && authority.rows.length > 0,
      statements: { school: SCHOOL_STATEMENT, guardian: GUARDIAN_STATEMENT },
      receipts: accepted.rows.map((row) => ({ id: row.id, document_id: row.document_id, version: row.version, content_hash: row.content_hash, scope: row.scope, subject_id: row.subject_id, accepted_at: row.accepted_at })),
    };
  }

  async hasGuardianAuthorisation(studentId: string, parentId?: string) {
    const ctx = this.identity();
    const result = await this.database.query(`SELECT DISTINCT a.kind, a.generation FROM legal_acceptances a
      JOIN legal_authorities v ON v.tenant_id=a.tenant_id AND v.id=a.authority_id AND v.revoked_at IS NULL
      JOIN student_guardians g ON g.tenant_id=v.tenant_id AND g.id::text=v.guardian_link_id AND g.student_id=v.student_id AND g.user_id=v.user_id AND g.status='active'
      JOIN tenant_memberships m ON m.tenant_id=g.tenant_id AND m.user_id=g.user_id AND m.status='active'
      JOIN LATERAL app.legal_identity(g.user_id) u ON true
      WHERE a.tenant_id=$1 AND a.scope='guardian' AND a.subject_id=$2 AND ($3::uuid IS NULL OR a.user_id=$3::uuid)
      AND NOT EXISTS (SELECT 1 FROM legal_guardian_withdrawals w WHERE w.tenant_id=a.tenant_id AND w.student_id=a.subject_id AND w.user_id=a.user_id AND w.withdrawn_at >= a.accepted_at)`, [ctx.tenant_id, studentId, parentId ?? null]);
    return outstandingDocuments(individualDocuments(), result.rows as { kind: string; generation: number }[]).length === 0;
  }

  accept(selections: { document_id: string; checked: boolean }[]) { return this.inLegalContext(() => this.acceptWithinScope(selections)); }

  private async acceptWithinScope(selections: { document_id: string; checked: boolean }[]) {
    const ctx = this.identity();
    await this.database.withRequestTransaction(async () => {
      await this.lockIdentity();
      const status = await this.status();
      // A repeated request may include already-accepted current documents. Validate every selection;
      // require all outstanding documents, but never turn a stale version into the current version.
      const selectable = currentDocuments.filter((doc) => doc.kind !== 'dpa' || (isDpaActive() && status.school_authority_verified));
      const selected = selectable.filter((doc) => selections.some((selection) => selection.document_id === doc.id));
      validateSelections(selections, selected);
      if (status.required_documents.some((doc) => !selected.some((item) => item.id === doc.id))) throw new BadRequestException('Select every required agreement.');
      if (!selected.length) throw new BadRequestException('Choose an agreement before continuing.');
      for (const doc of selected) {
        const school = doc.kind === 'dpa';
        const authority = school ? await this.database.query(`SELECT id FROM legal_authorities WHERE tenant_id=$1 AND user_id=$2::uuid AND kind='school' AND revoked_at IS NULL FOR UPDATE`, [ctx.tenant_id, ctx.user_id]) : null;
        if (school && !authority?.rows[0]) throw new ForbiddenException('Verified institutional authority is required.');
        await this.record(doc, school ? 'school' : 'individual', school ? ctx.tenant_id! : ctx.user_id,
          authority?.rows[0]?.id ?? null, school ? SCHOOL_STATEMENT : doc.kind === 'privacy' ? 'I acknowledge the Privacy Policy.' : status.guardian_required ? 'I acknowledge the Terms of Use. My acknowledgement is not parental consent.' : 'I agree to the Terms of Use.');
      }
    });
    return this.status();
  }

  async authoriseChild(studentId: string, selections: { document_id: string; checked: boolean }[], checked: boolean) {
    const ctx = this.identity();
    if (checked !== true) throw new BadRequestException('Guardian authorisation must be deliberately checked.');
    validateSelections(selections, individualDocuments());
    await this.database.withRequestTransaction(async () => {
      await this.lockIdentity();
      const status = await this.status();
      if (status.required_documents.some((doc) => doc.kind !== 'dpa')) throw new ForbiddenException('Complete your own agreements first.');
      if (status.guardian_required) throw new ForbiddenException('A child cannot provide parental authorisation.');
      const child = status.guardian_children.find((row) => row.student_id === studentId && row.verified);
      if (!child) throw new ForbiddenException('A verified, active guardian relationship is required.');
      const authority = await this.database.query(`SELECT id FROM legal_authorities WHERE tenant_id=$1 AND user_id=$2::uuid AND student_id=$3 AND kind='guardian' AND revoked_at IS NULL FOR UPDATE`, [ctx.tenant_id, ctx.user_id, studentId]);
      if (!authority.rows[0]) throw new ForbiddenException('Guardian verification is no longer active.');
      for (const doc of individualDocuments()) await this.record(doc, 'guardian', studentId, authority.rows[0].id, GUARDIAN_STATEMENT);
    });
    return this.status();
  }

  async withdrawChild(studentId: string, checked: boolean) {
    const ctx = this.identity();
    if (checked !== true) throw new BadRequestException('Confirm withdrawal using the checkbox.');
    await this.database.withRequestTransaction(async () => {
      await this.lockIdentity();
      const child = (await this.status()).guardian_children.find((row) => row.student_id === studentId);
      if (!child) throw new ForbiddenException('An active guardian relationship is required.');
      const result = await this.database.query(`INSERT INTO legal_guardian_withdrawals(tenant_id,user_id,student_id,request_id) VALUES ($1,$2::uuid,$3,$4) RETURNING id`, [ctx.tenant_id, ctx.user_id, studentId, ctx.request_id]);
      await this.database.query(`UPDATE legal_authorities SET revoked_at=NOW(),revoked_by=$2::uuid WHERE tenant_id=$1 AND user_id=$2::uuid AND student_id=$3 AND kind='guardian' AND revoked_at IS NULL`, [ctx.tenant_id, ctx.user_id, studentId]);
      await this.evidenceEvent(result.rows[0].id, 'legal.guardian_authorisation.withdrawn', { student_id: studentId });
    });
    return this.status();
  }

  async lockIdentity() {
    const ctx = this.identity();
    await this.database.query('SELECT id FROM app.legal_identity($1::uuid,true)', [ctx.user_id]);
    await this.database.query('SELECT id FROM tenant_memberships WHERE tenant_id=$1 AND user_id=$2::uuid FOR UPDATE', [ctx.tenant_id, ctx.user_id]);
    await this.database.query('SELECT id FROM student_guardians WHERE tenant_id=$1 AND user_id=$2::uuid FOR UPDATE', [ctx.tenant_id, ctx.user_id]);
  }

  private async record(doc: LegalDocument, scope: string, subject: string, authority: string | null, statement: string) {
    const ctx = this.identity();
    const result = await this.database.query(`INSERT INTO legal_acceptances(tenant_id,user_id,scope,subject_id,document_id,kind,generation,authority_id,actor_role,session_id,request_id,statement,evidence)
      VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8::uuid,$9,$10,$11,$12,$13::jsonb) ON CONFLICT DO NOTHING RETURNING id`,
    [ctx.tenant_id, ctx.user_id, scope, subject, doc.id, doc.kind, doc.generation, authority, ctx.role ?? 'unknown', ctx.session_id, ctx.request_id, statement, JSON.stringify({ content_hash: doc.sha256, source_hash: doc.sourceSha256, method: 'unchecked_checkbox', authority_id: authority, ...(scope === 'school' ? { release: DPA_RELEASE } : {}) })]);
    if (result.rows[0]) await this.evidenceEvent(result.rows[0].id, 'legal.agreement.accepted', { document_id: doc.id, kind: doc.kind, scope, subject_id: subject, content_hash: doc.sha256 });
  }

  async evidenceEvent(id: string, eventType: string, payload: Record<string, unknown>) {
    const ctx = this.identity();
    // Use the same DatabaseService transaction for evidence, audit and the existing event outbox.
    await this.database.query(`INSERT INTO audit_logs(tenant_id,actor_user_id,request_id,action,resource_type,resource_id,metadata)
      VALUES ($1,$2::uuid,$3,$4,'legal_agreement',$5::uuid,$6::jsonb)`, [ctx.tenant_id, ctx.user_id, ctx.request_id, eventType, id, JSON.stringify(payload)]);
    await this.database.query(`INSERT INTO outbox_events(tenant_id,school_id,event_key,event_name,aggregate_type,aggregate_id,payload,headers,actor_user_id,actor_role,source_dashboard,correlation_id)
      VALUES ($1,$1,$2,$3,'legal_agreement',$4::uuid,$5::jsonb,$6::jsonb,$7::uuid,$8,'legal',$9::uuid)`,
    [ctx.tenant_id, `${eventType}:${id}`, eventType, id, JSON.stringify(payload), JSON.stringify({ request_id: ctx.request_id, tenant_id: ctx.tenant_id, school_id: ctx.tenant_id, user_id: ctx.user_id, role: ctx.role, session_id: ctx.session_id }), ctx.user_id, ctx.role, /^[0-9a-f-]{36}$/i.test(ctx.trace_id) ? ctx.trace_id : randomUUID()]);
  }
}
