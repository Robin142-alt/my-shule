import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { WorkflowRepository } from '../events/repositories/workflow.repository';
import { AcademicsRepository } from './repositories/academics.repository';
import { createCsvReportArtifact } from '../../common/reports/report-csv-artifact';
import { syllabusProgress, validateSyllabusContent } from './syllabus-policy';

const MANAGERS = new Set(['principal', 'deputy_principal', 'dean_academics', 'school_admin']);
const STAFF_ROLES = new Set([...MANAGERS, 'teacher', 'class_teacher', 'hod', 'head_of_subject', 'grade_master',
  'exams_manager', 'discipline_master', 'boarding_master', 'school_counsellor']);
type SubjectRight = { subject_id: string; academic_year_id: string | null };
const scopedRight = (rights: SubjectRight[], subject: string, year: string) => rights.some(right => right.subject_id === subject && (!right.academic_year_id || right.academic_year_id === year));

@Injectable()
export class SyllabusService {
  constructor(private readonly prisma: PrismaService, private readonly context: RequestContextService,
    private readonly academics: AcademicsRepository, private readonly events: EventPublisherService,
    private readonly workflows: WorkflowRepository) {}

  private actor() {
    const actor = this.context.requireStore();
    if (!actor.is_authenticated || !actor.tenant_id || !actor.user_id) throw new UnauthorizedException('Sign in to a school to use syllabus coverage.');
    if (!STAFF_ROLES.has(actor.role || '')) throw new ForbiddenException('Syllabus coverage is restricted to authorized school staff.');
    if (!actor.permissions.some(permission => ['academics:read', 'academics:*', '*:*'].includes(permission))) throw new ForbiddenException('Academic access is required.');
    return { ...actor, tenant_id: actor.tenant_id };
  }

  private async transaction<T>(work: (tx: any, actor: ReturnType<SyllabusService['actor']>) => Promise<T>) {
    const actor = this.actor();
    return this.prisma.executeWithTenant(actor.tenant_id, actor.user_id, async tx => {
      const membership = await tx.$queryRawUnsafe<any[]>('SELECT 1 FROM tenant_memberships WHERE tenant_id=$1 AND user_id::text=$2 AND status=\'active\' LIMIT 1', actor.tenant_id, actor.user_id);
      if (!membership.length) throw new ForbiddenException('An active membership in this school is required.');
      return work(tx, actor);
    });
  }

  private rights(tx: any, tenant: string, user: string): Promise<SubjectRight[]> {
    return tx.$queryRawUnsafe(`
      SELECT ap.subject_id::text, ap.academic_year_id::text
      FROM academics_role_appointments ap JOIN subjects s ON s.tenant_id=ap.tenant_id AND s.id::text=ap.subject_id::text
      WHERE ap.tenant_id=$1 AND ap.teacher_user_id::text=$2 AND ap.role_type IN ('head_of_subject','hos','subject_coordinator')
        AND ap.status='active' AND ap.effective_from <= CURRENT_DATE AND (ap.effective_to IS NULL OR ap.effective_to >= CURRENT_DATE)
        AND ap.class_section_id IS NULL AND ap.stream_id IS NULL AND s.status='active' AND s.archived_at IS NULL
      UNION
      SELECT s.id::text, NULL::text FROM subjects s JOIN academics_departments d ON d.tenant_id=s.tenant_id AND d.id=s.department_id
      WHERE s.tenant_id=$1 AND s.status='active' AND s.archived_at IS NULL AND d.is_active AND d.status='active' AND d.archived_at IS NULL
        AND ((d.head_of_department_user_id::text=$2 AND NOT EXISTS (SELECT 1 FROM academics_department_hod_appointments history
          WHERE history.tenant_id=d.tenant_id AND history.department_id=d.id)) OR EXISTS (
          SELECT 1 FROM academics_department_hod_appointments ap WHERE ap.tenant_id=s.tenant_id AND ap.department_id=d.id
            AND ap.teacher_user_id::text=$2 AND ap.status='active' AND ap.effective_from <= CURRENT_DATE
            AND (ap.effective_to IS NULL OR ap.effective_to >= CURRENT_DATE)))
    `, tenant, user);
  }

  async workspace() {
    return this.transaction(async (tx, actor) => {
      const rights = await this.rights(tx, actor.tenant_id, actor.user_id);
      const monitor = MANAGERS.has(actor.role || '');
      const scope = JSON.stringify(rights);
      const allocations = await tx.$queryRawUnsafe(`
        SELECT a.id::text, a.teacher_user_id::text, a.subject_id::text, a.class_section_id::text, a.stream_id::text,
          c.grade_level, c.name AS class_name, stream.name AS stream_name, c.academic_year_id::text,
          term.id::text AS academic_term_id, term.name AS term_name, year.name AS year_name, s.name AS subject,
          COALESCE(staff.display_name, a.teacher_user_id::text) AS teacher_name,
          (a.teacher_user_id::text=$2 AND a.status='active' AND a.lesson_record_allowed AND a.effective_from <= CURRENT_DATE
            AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE) AND c.is_active AND c.status='active'
            AND (a.stream_id IS NULL OR (stream.is_active AND stream.status='active'))
            AND s.status='active' AND s.archived_at IS NULL AND term.status IN ('draft','active') AND year.status IN ('draft','active')) AS can_record
        FROM teacher_subject_assignments a
        JOIN class_sections c ON c.tenant_id=a.tenant_id AND c.id::text=a.class_section_id::text
        JOIN subjects s ON s.tenant_id=a.tenant_id AND s.id::text=a.subject_id::text
        JOIN academic_years year ON year.tenant_id=c.tenant_id AND year.id::text=c.academic_year_id::text
        JOIN academic_terms term ON term.tenant_id=a.tenant_id AND term.academic_year_id::text=c.academic_year_id::text
          AND (a.academic_term_id IS NULL OR term.id::text=a.academic_term_id::text)
        LEFT JOIN class_streams stream ON stream.tenant_id=a.tenant_id AND stream.id::text=a.stream_id::text AND stream.class_section_id::text=c.id::text
        LEFT JOIN staff_profiles staff ON staff.tenant_id=a.tenant_id AND staff.user_id::text=a.teacher_user_id::text
        WHERE a.tenant_id=$1 AND ($3 OR a.teacher_user_id::text=$2 OR EXISTS (
          SELECT 1 FROM jsonb_to_recordset($4::jsonb) AS r(subject_id text, academic_year_id text)
          WHERE r.subject_id=a.subject_id::text AND (r.academic_year_id IS NULL OR r.academic_year_id=c.academic_year_id::text)))
        ORDER BY s.name, c.name, stream.name, term.starts_on, teacher_name, a.id
      `, actor.tenant_id, actor.user_id, monitor, scope) as any[];
      const plans = await tx.$queryRawUnsafe(`SELECT p.*, s.name AS subject FROM academics_syllabi p
        JOIN subjects s ON s.tenant_id=p.tenant_id AND s.id::text=p.subject_id
        WHERE p.tenant_id=$1 AND ($3 OR EXISTS (
          SELECT 1 FROM jsonb_to_recordset($4::jsonb) AS r(subject_id text, academic_year_id text)
          WHERE r.subject_id=p.subject_id AND (r.academic_year_id IS NULL OR r.academic_year_id=p.academic_year_id))
          OR EXISTS (SELECT 1 FROM teacher_subject_assignments a JOIN class_sections c ON c.tenant_id=a.tenant_id AND c.id::text=a.class_section_id::text
            WHERE a.tenant_id=p.tenant_id AND a.teacher_user_id::text=$2 AND a.subject_id::text=p.subject_id
              AND c.academic_year_id::text=p.academic_year_id AND c.grade_level=p.grade_level
              AND (a.academic_term_id IS NULL OR a.academic_term_id::text=p.academic_term_id))) ORDER BY p.updated_at DESC`,
        actor.tenant_id, actor.user_id, monitor, scope) as any[];
      const coverage = await tx.$queryRawUnsafe(`SELECT coverage.* FROM academics_syllabus_coverage coverage
        WHERE coverage.tenant_id=$1 AND coverage.assignment_id=ANY($2::text[])`, actor.tenant_id, allocations.map(a => a.id)) as any[];
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const scopeKey = (p: any) => JSON.stringify([p.subject_id,p.grade_level,p.academic_year_id,p.academic_term_id]);
      const plansByScope = new Map(plans.map(plan => [scopeKey(plan),plan]));
      const coverageByAllocation = new Map<string, any[]>();
      for (const record of coverage) {
        const key = JSON.stringify([record.assignment_id,record.syllabus_id,record.teacher_user_id]);
        const records = coverageByAllocation.get(key) ?? []; records.push(record); coverageByAllocation.set(key,records);
      }
      const items = allocations.map(allocation => {
        const syllabus = plansByScope.get(scopeKey(allocation));
        const records = coverageByAllocation.get(JSON.stringify([allocation.id,syllabus?.id,allocation.teacher_user_id])) ?? [];
        return { ...allocation, syllabus_id: syllabus?.id ?? null, records,
          progress: syllabus ? syllabusProgress(syllabus, records, today) : null };
      });
      const subjects = await tx.$queryRawUnsafe(`SELECT id::text, name FROM subjects WHERE tenant_id=$1 AND status='active' AND archived_at IS NULL ORDER BY name`, actor.tenant_id) as any[];
      const years = await tx.$queryRawUnsafe(`SELECT id::text,name,status FROM academic_years WHERE tenant_id=$1 AND status <> 'archived' ORDER BY starts_on DESC`, actor.tenant_id);
      const terms = await tx.$queryRawUnsafe(`SELECT id::text,academic_year_id::text,name,starts_on::text,ends_on::text,status FROM academic_terms WHERE tenant_id=$1 AND status <> 'archived' ORDER BY starts_on`, actor.tenant_id);
      const grades = await tx.$queryRawUnsafe(`SELECT DISTINCT grade_level,academic_year_id::text FROM class_sections WHERE tenant_id=$1 AND is_active AND status='active' ORDER BY grade_level`, actor.tenant_id);
      return { school_id: actor.tenant_id, generated_at: new Date().toISOString(), generated_by: actor.user_id,
        can_monitor: monitor || rights.length > 0, rights, subjects: subjects.filter(s => monitor || rights.some(r => r.subject_id === s.id) || allocations.some(a => a.subject_id === s.id)),
        years, terms, grades, syllabi: plans.map(p => ({ ...p, can_manage: scopedRight(rights, p.subject_id, p.academic_year_id)
          && years.some((y: any) => y.id === p.academic_year_id && ['draft','active'].includes(y.status))
          && terms.some((t: any) => t.id === p.academic_term_id && ['draft','active'].includes(t.status)) })), items };
    });
  }

  async save(input: any, syllabusId?: string) {
    return this.transaction(async (tx, actor) => {
      if (!input || ['subject_id', 'academic_year_id', 'academic_term_id', 'grade_level'].some(key => typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 100)) {
        throw new BadRequestException('Select a subject, grade/form, academic year and term.');
      }
      const rights = await this.rights(tx, actor.tenant_id, actor.user_id);
      if (!scopedRight(rights, input.subject_id, input.academic_year_id)) throw new ForbiddenException('Only the appointed subject head or authorized department head can define this syllabus.');
      const [term] = await tx.$queryRawUnsafe(`SELECT t.starts_on::text,t.ends_on::text FROM academic_terms t
        JOIN academic_years y ON y.tenant_id=t.tenant_id AND y.id::text=t.academic_year_id::text
        WHERE t.tenant_id=$1 AND t.id::text=$2 AND t.academic_year_id::text=$3 AND t.status IN ('active','draft') AND y.status IN ('active','draft')
          AND EXISTS (SELECT 1 FROM class_sections c WHERE c.tenant_id=t.tenant_id AND c.academic_year_id::text=$3 AND c.grade_level=$4 AND c.is_active AND c.status='active')`,
        actor.tenant_id, input.academic_term_id, input.academic_year_id, input.grade_level);
      if (!term) throw new BadRequestException('Select a valid grade/form, year and open term from this school.');
      // Serialize both the initial create and future edits with teacher ticks.
      await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',
        JSON.stringify(['syllabus', actor.tenant_id, input.subject_id, input.academic_year_id, input.academic_term_id, input.grade_level]));
      const [previous] = await tx.$queryRawUnsafe(`SELECT * FROM academics_syllabi WHERE tenant_id=$1 AND subject_id=$2 AND academic_year_id=$3 AND academic_term_id=$4 AND grade_level=$5 FOR UPDATE`,
        actor.tenant_id, input.subject_id, input.academic_year_id, input.academic_term_id, input.grade_level);
      if (syllabusId && previous?.id !== syllabusId) throw new NotFoundException('Syllabus was not found in this school and academic scope.');
      if ((!syllabusId && previous) || (previous && input.version !== previous.version)) throw new ConflictException('The syllabus has changed. Refresh before saving your revision.');
      const content = validateSyllabusContent(input, term, previous);
      const id = previous?.id || randomUUID();
      const [saved] = await tx.$queryRawUnsafe(`INSERT INTO academics_syllabi
        (id,tenant_id,subject_id,academic_year_id,academic_term_id,grade_level,topics,milestones,created_by_user_id,updated_by_user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::uuid,$9::uuid)
        ON CONFLICT (tenant_id,id) DO UPDATE SET topics=EXCLUDED.topics,milestones=EXCLUDED.milestones,
          version=academics_syllabi.version+1,updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=NOW() RETURNING *`,
        id, actor.tenant_id, input.subject_id, input.academic_year_id, input.academic_term_id, input.grade_level,
        JSON.stringify(content.topics), JSON.stringify(content.milestones), actor.user_id);
      await this.record(tx, actor, 'academic.syllabus.updated', 'syllabus', saved, previous ?? null);
      const teachers = await tx.$queryRawUnsafe(`SELECT DISTINCT a.teacher_user_id::text FROM teacher_subject_assignments a
        JOIN class_sections c ON c.tenant_id=a.tenant_id AND c.id::text=a.class_section_id::text
        WHERE a.tenant_id=$1 AND a.subject_id::text=$2 AND c.academic_year_id::text=$3 AND c.grade_level=$4
          AND (a.academic_term_id IS NULL OR a.academic_term_id::text=$5) AND a.status='active'`,
        actor.tenant_id, saved.subject_id, saved.academic_year_id, saved.grade_level, saved.academic_term_id);
      for (const teacher of teachers) await this.workflows.createNotification({ tenant_id: actor.tenant_id,
        notification_key: `syllabus:${saved.id}:${saved.version}:${teacher.teacher_user_id}`, recipient_user_id: teacher.teacher_user_id,
        type: 'academic_assignment', title: previous ? 'Syllabus revised' : 'Syllabus ready',
        body: 'Your subject syllabus is ready. Open Syllabus Coverage to review topics, target dates and milestones.',
        priority: 'normal', source_module: 'academics', source_record_id: saved.id, metadata: { school_id: actor.tenant_id, syllabus_id: saved.id } }, tx);
      return saved;
    });
  }

  async recordCoverage(syllabusId: string, subtopicId: string, input: any) {
    return this.transaction(async (tx, actor) => {
      if (!input || typeof input.assignment_id !== 'string' || input.assignment_id.length > 100 || typeof input.completed !== 'boolean'
        || (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 2000))
        || !Number.isInteger(input.version) || input.version < 0 || !Number.isInteger(input.syllabus_version) || input.syllabus_version < 1) throw new BadRequestException('Provide an allocation, completion checkbox, syllabus and record versions and an optional note of up to 2,000 characters.');
      const [plan] = await tx.$queryRawUnsafe('SELECT * FROM academics_syllabi WHERE tenant_id=$1 AND id=$2 FOR UPDATE', actor.tenant_id, syllabusId);
      if (!plan) throw new NotFoundException('Syllabus was not found in this school.');
      if (input.syllabus_version !== plan.version) throw new ConflictException('The syllabus changed. Refresh to review the current subtopics before recording coverage.');
      const [assignment] = await tx.$queryRawUnsafe(`SELECT a.id FROM teacher_subject_assignments a
        JOIN class_sections c ON c.tenant_id=a.tenant_id AND c.id::text=a.class_section_id::text
        JOIN subjects s ON s.tenant_id=a.tenant_id AND s.id::text=a.subject_id::text
        JOIN academic_terms t ON t.tenant_id=a.tenant_id AND t.id::text=$5
        JOIN academic_years y ON y.tenant_id=c.tenant_id AND y.id::text=c.academic_year_id::text
        LEFT JOIN class_streams stream ON stream.tenant_id=a.tenant_id AND stream.id::text=a.stream_id::text AND stream.class_section_id::text=c.id::text
        WHERE a.tenant_id=$1 AND a.id::text=$2 AND a.teacher_user_id::text=$3 AND a.subject_id::text=$4
          AND (a.academic_term_id IS NULL OR a.academic_term_id::text=$5) AND c.academic_year_id::text=$6 AND t.academic_year_id::text=$6
          AND c.grade_level=$7 AND c.is_active AND c.status='active' AND a.status='active' AND a.lesson_record_allowed AND s.status='active' AND s.archived_at IS NULL
          AND (a.stream_id IS NULL OR (stream.is_active AND stream.status='active'))
          AND a.effective_from <= CURRENT_DATE AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
          AND t.status IN ('draft','active') AND y.status IN ('draft','active') FOR SHARE OF a`,
        actor.tenant_id, input.assignment_id, actor.user_id, plan.subject_id, plan.academic_term_id, plan.academic_year_id, plan.grade_level);
      if (!assignment) throw new ForbiddenException('Only the teacher with this active class, stream, subject and term allocation can record coverage.');
      if (!plan.topics.some((topic: any) => !topic.archived && topic.subtopics.some((sub: any) => sub.id === subtopicId && !sub.archived))) throw new BadRequestException('Select an active subtopic from this syllabus.');
      const [previous] = await tx.$queryRawUnsafe(`SELECT * FROM academics_syllabus_coverage WHERE tenant_id=$1 AND syllabus_id=$2 AND assignment_id=$3 AND subtopic_id=$4 AND teacher_user_id=$5 FOR UPDATE`,
        actor.tenant_id, syllabusId, input.assignment_id, subtopicId, actor.user_id);
      if ((previous?.version ?? 0) !== input.version) throw new ConflictException('This coverage record changed. Refresh before saving.');
      const note = input.note === undefined ? previous?.note ?? '' : input.note.trim();
      if (previous && previous.completed === input.completed && previous.note === note) return previous;
      const [saved] = await tx.$queryRawUnsafe(`INSERT INTO academics_syllabus_coverage
        (tenant_id,syllabus_id,assignment_id,subtopic_id,teacher_user_id,completed,completed_at,note,created_by_user_id,updated_by_user_id)
        VALUES ($1,$2,$3,$4,$5::text,$6,CASE WHEN $6 THEN NOW() ELSE NULL END,$7,$5::text::uuid,$5::text::uuid)
        ON CONFLICT (tenant_id,syllabus_id,assignment_id,teacher_user_id,subtopic_id) DO UPDATE SET completed=EXCLUDED.completed,
          completed_at=CASE WHEN NOT EXCLUDED.completed THEN NULL WHEN academics_syllabus_coverage.completed THEN academics_syllabus_coverage.completed_at ELSE NOW() END,
          note=EXCLUDED.note,version=academics_syllabus_coverage.version+1,updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=NOW() RETURNING *`,
        actor.tenant_id, syllabusId, input.assignment_id, subtopicId, actor.user_id, input.completed, note);
      await this.record(tx, actor, 'academic.syllabus.coverage_updated', 'syllabus_coverage', saved, previous ?? null);
      return saved;
    });
  }

  private async record(tx: any, actor: ReturnType<SyllabusService['actor']>, event: 'academic.syllabus.updated' | 'academic.syllabus.coverage_updated' | 'academic.syllabus.exported', type: string, saved: any, previous: any) {
    await this.academics.appendAuditLog({ tenant_id: actor.tenant_id, entity_type: type, entity_id: saved.id,
      action: event, actor_user_id: actor.user_id, actor_role: actor.role, previous_values: previous, new_values: saved,
      correlation_id: actor.trace_id, metadata: { source_dashboard: actor.role, school_id: actor.tenant_id } }, tx);
    await this.events.publish({ event_name: event, event_key: `${event}:${saved.id}:${saved.version ?? 1}`, aggregate_type: type,
      aggregate_id: saved.id, payload: { tenant_id: actor.tenant_id, entity_type: type, entity_id: saved.id, action: event,
        version: saved.version ?? 1, occurred_at: new Date().toISOString(), previous_values: previous, new_values: saved } }, tx);
  }

  async exportReport() {
    const data = await this.workspace();
    const reportId = randomUUID();
    // Protect spreadsheet users from formula injection in school-entered text.
    const safe = (value: unknown) => /^[\s]*[=+@-]/.test(String(value ?? '')) ? `'${value}` : String(value ?? '');
    const artifact = createCsvReportArtifact({ reportId, title: 'Syllabus coverage', filename: `syllabus-coverage-${reportId}.csv`,
      headers: ['Document number','School ID','Generated at','Generated by','Teacher','Subject','Grade/Form','Class','Stream','Year','Term','Required subtopics','Completed','Coverage %','Expected %','Completed topics','Outstanding subtopics','Overdue subtopics','Milestones','Status'],
      rows: data.items.map(item => [reportId,data.school_id,data.generated_at,data.generated_by,safe(item.teacher_name),safe(item.subject),safe(item.grade_level),safe(item.class_name),safe(item.stream_name),safe(item.year_name),safe(item.term_name),
        item.progress?.total ?? 0,item.progress?.completed ?? 0,item.progress?.percentage ?? 0,item.progress?.expected_percentage ?? 0,item.progress?.completed_topics ?? 0,
        safe(item.progress?.remaining.map((sub: {topic: string; title: string}) => `${sub.topic}: ${sub.title}`).join('; ')),safe(item.progress?.overdue.map((sub: {topic: string; title: string}) => `${sub.topic}: ${sub.title}`).join('; ')),
        safe(item.progress?.milestones.map((m: {title: string; due_on: string; status: string}) => `${m.title} (${m.due_on}): ${m.status}`).join('; ')),item.progress?.status ?? 'Syllabus not set']) });
    await this.transaction((tx, actor) => this.record(tx, actor, 'academic.syllabus.exported', 'syllabus_report',
      { id: reportId, row_count: artifact.row_count, checksum_sha256: artifact.checksum_sha256 }, null));
    return artifact;
  }
}
