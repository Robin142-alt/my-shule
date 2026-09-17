import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import {
  captureCohortConfiguration, CohortContext, CohortTx, ensureCohortContexts,
  ensureCohortMigration, lockCohortSchool, retireCohortPlacement, snapshotCohortConfiguration,
} from '../academics/cohort-configuration';
import { updateStudentCohortPosition, updateStudentCohortSubjects } from '../academics/cohort-enrollment';
import { AdvanceAcademicLifecycleDto, CohortPromotionCommandDto, CohortPromotionMappingDto } from './dto/register-application.dto';

type Actor = { tenantId: string; userId: string | null; role?: string | null };
type Row = Record<string, any>;
type PlannedMove = {
  mapping: CohortPromotionMappingDto; source: CohortContext; target: Row;
  roster: Row[]; students: Row[]; full: boolean; existingDestination: CohortContext | null;
  snapshot: { subjects: Row[]; teachers: Row[] };
  continueDestination?: boolean;
};

const rows = async <T = Row>(tx: CohortTx, sql: string, values: unknown[] = []): Promise<T[]> => {
  const result = await tx.$queryRawUnsafe(sql, ...values);
  return Array.isArray(result) ? result : result?.rows ?? [];
};
const contextKey = (classId: string, streamId?: string | null) => JSON.stringify([classId, streamId || null]);
const date = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);
const configurationIdentity = (snapshot: {subjects: Row[]; teachers: Row[]}) => JSON.stringify({
  subjects: snapshot.subjects.map(row=>JSON.stringify([row.subject_id,row.status,row.is_compulsory,row.is_examinable,
    date(row.effective_from),date(row.effective_to),row.lessons_per_week ?? 5,row.metadata ?? {}])).sort(),
  teachers: snapshot.teachers.map(row=>JSON.stringify([row.subject_id,row.teacher_user_id,row.assignment_type,row.is_primary,
    row.mark_entry_allowed,row.lesson_record_allowed,row.report_comment_allowed,date(row.effective_from),date(row.effective_to)])).sort(),
});

@Injectable()
export class CohortPromotionService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventPublisherService) {}

  private transaction<T>(actor: Actor, work: (tx: CohortTx) => Promise<T>) {
    if (!actor.tenantId || !actor.userId) throw new BadRequestException('An authenticated school staff identity is required.');
    return this.prisma.executeWithTenant(actor.tenantId, actor.userId, async (tx: CohortTx) => {
      await lockCohortSchool(tx, actor.tenantId);
      await ensureCohortMigration(tx, actor.tenantId);
      return work(tx);
    });
  }

  async options(actor: Actor) {
    return this.transaction(actor, async (tx) => {
      const classes = await this.classes(tx, actor.tenantId);
      // Initialising an empty context is safe: it never inherits a departed cohort's configuration.
      for (const section of classes) await ensureCohortContexts(tx, actor.tenantId, section.id);
      const placements = await rows(tx, `
        SELECT placement.*, section.name AS class_section_name, stream.name AS stream_name
        FROM academic_cohort_placements placement
        JOIN class_sections section ON section.tenant_id = placement.tenant_id AND section.id::text = placement.class_section_id
        LEFT JOIN class_streams stream ON stream.tenant_id = placement.tenant_id AND stream.id::text = placement.stream_id
        WHERE placement.tenant_id = $1 AND placement.status = 'active'
        ORDER BY section.name, stream.name, placement.id`, [actor.tenantId]);
      const available = [];
      for (const placement of placements) {
        const students = await this.roster(tx, actor.tenantId, placement as CohortContext);
        available.push({ ...placement, cohort_name: `${placement.class_section_name}${placement.stream_name ? ` ${placement.stream_name}` : ''}`,
          student_count: students.length, students: students.map((student) => ({ id: student.id, name: student.name })) });
      }
      return {
        placements: available, classes,
        streams: await rows(tx, `SELECT id::text, name, class_section_id::text FROM class_streams
          WHERE tenant_id = $1 AND COALESCE(status, 'active') = 'active' ORDER BY name`, [actor.tenantId]),
        years: await rows(tx, `SELECT id::text, name, starts_on, ends_on FROM academic_years
          WHERE tenant_id = $1 AND COALESCE(status, 'active') NOT IN ('archived','inactive') ORDER BY starts_on`, [actor.tenantId]),
      };
    });
  }

  async preview(actor: Actor, command: CohortPromotionCommandDto) {
    this.validateCommand(command);
    return this.transaction(actor, async (tx) => {
      const plan = await this.plan(tx, actor, command);
      return this.publicPlan(plan);
    });
  }

  async commit(actor: Actor, command: CohortPromotionCommandDto) {
    this.validateCommand(command);
    return this.transaction(actor, (tx) => this.commitInTransaction(tx, actor, command));
  }

  private fingerprint(command: CohortPromotionCommandDto) {
    return createHash('sha256').update(JSON.stringify({ reason: command.reason.trim(), mappings: command.mappings.map((mapping) => ({
      source_placement_id: mapping.source_placement_id, expected_version: mapping.expected_version,
      target_class_section_id: mapping.target_class_section_id, target_stream_id: mapping.target_stream_id || null,
      student_ids: mapping.student_ids ? [...mapping.student_ids].sort() : null,
    })).sort((a, b) => a.source_placement_id.localeCompare(b.source_placement_id)) })).digest('hex');
  }

  private async commitInTransaction(tx: CohortTx, actor: Actor, command: CohortPromotionCommandDto) {
    const fingerprint = this.fingerprint(command);
    const [existing] = await rows(tx, `SELECT * FROM academic_cohort_promotion_operations
      WHERE tenant_id = $1 AND request_id = $2 FOR UPDATE`, [actor.tenantId, command.request_id]);
    if (existing) {
      if (existing.request_fingerprint !== fingerprint) throw new ConflictException('This promotion request key was already used for a different mapping.');
      return { ...existing.result, replayed: true };
    }
    const plan = await this.plan(tx, actor, command);
    if (plan.blockers.length) throw new ConflictException({ message: 'Promotion could not be committed. Review the preview blockers.', blockers: plan.blockers });

    // Every roster and configuration has been captured before any source or destination changes.
    const retired = new Set<string>();
    for (const move of plan.moves) {
      if (move.full && !retired.has(move.source.id)) {
        await retireCohortPlacement(tx, actor.tenantId, move.source.id, actor.userId);
        retired.add(move.source.id);
      }
    }
    for (const move of plan.moves) {
      const destination = move.existingDestination;
      if (destination && !move.continueDestination && !retired.has(destination.id)) {
        await retireCohortPlacement(tx, actor.tenantId, destination.id, actor.userId);
        await rows(tx, `UPDATE academic_cohorts SET status = 'retired', updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2 RETURNING id`, [actor.tenantId, destination.cohort_id]);
        retired.add(destination.id);
      }
    }

    const results = [];
    for (const move of plan.moves) {
      let cohortId = move.source.cohort_id;
      if (move.continueDestination) cohortId = move.existingDestination!.cohort_id;
      else if (!move.full) {
        const [child] = await rows(tx, `INSERT INTO academic_cohorts (tenant_id, parent_cohort_id, created_by_user_id)
          VALUES ($1,$2,$3::uuid) RETURNING id`, [actor.tenantId, cohortId, actor.userId]);
        cohortId = child.id;
      }
      if (!move.full) await rows(tx, `UPDATE academic_cohort_placements SET version=version+1,updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2 RETURNING id`,[actor.tenantId,move.source.id]);
      const target = move.continueDestination ? move.existingDestination! : (await rows<CohortContext>(tx, `INSERT INTO academic_cohort_placements
        (tenant_id,cohort_id,academic_year_id,class_section_id,stream_id,source_placement_id,created_by_user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7::uuid) RETURNING *`, [actor.tenantId, cohortId, move.target.academic_year_id,
        move.target.id, move.mapping.target_stream_id || null, move.source.id, actor.userId]))[0];
      const configuration = move.continueDestination ? await captureCohortConfiguration(tx,actor.tenantId,target.id)
        : await snapshotCohortConfiguration(tx, actor.tenantId, move.source.id, target, actor.userId, move.snapshot);
      if (move.continueDestination) {
        await rows(tx, `UPDATE academic_cohort_placements SET version=version+1,updated_at=NOW()
          WHERE tenant_id=$1 AND id=$2 RETURNING id`,[actor.tenantId,target.id]);
        if (move.full) await rows(tx, `UPDATE academic_cohorts SET status='retired',updated_at=NOW()
          WHERE tenant_id=$1 AND id=$2 RETURNING id`,[actor.tenantId,move.source.cohort_id]);
      }
      for (const student of move.students) await this.promoteLearner(tx, actor, move, target, student, command.reason);
      const result = { source_placement_id: move.source.id, target_placement_id: target.id, cohort_id: cohortId,
        student_ids: move.students.map((student) => student.id), subject_count: configuration.subjects.filter(subject => subject.status === 'active').length, teacher_count: configuration.teachers.length };
      await this.recordChange(tx, actor, command, move, target, result, configuration.teachers);
      results.push(result);
    }
    const result = { request_id: command.request_id, promoted_students: results.reduce((n, item) => n + item.student_ids.length, 0),
      moved_cohorts: results.length, results, warnings: plan.warnings, replayed: false };
    await rows(tx, `INSERT INTO academic_cohort_promotion_operations
      (tenant_id,request_id,request_fingerprint,status,actor_user_id,reason,result)
      VALUES ($1,$2,$3,'completed',$4::uuid,$5,$6::jsonb) RETURNING id`,
    [actor.tenantId, command.request_id, fingerprint, actor.userId, command.reason.trim(), JSON.stringify(result)]);
    return result;
  }

  private validateCommand(command: CohortPromotionCommandDto) {
    if (!command.request_id?.trim() || command.request_id.length > 128) throw new BadRequestException('A stable promotion request ID is required.');
    if (!command.reason?.trim() || command.reason.length > 1000) throw new BadRequestException('Enter a promotion reason of at most 1000 characters.');
    if (!Array.isArray(command.mappings) || !command.mappings.length || command.mappings.length > 100) throw new BadRequestException('Select between 1 and 100 cohort mappings.');
    for (const mapping of command.mappings) {
      if (!mapping.source_placement_id || !mapping.target_class_section_id || !Number.isInteger(mapping.expected_version) || mapping.expected_version < 1)
        throw new BadRequestException('Every mapping needs a source placement, its version, and a destination class.');
      if (mapping.student_ids && (!mapping.student_ids.length || mapping.student_ids.length > 5000 || new Set(mapping.student_ids).size !== mapping.student_ids.length))
        throw new BadRequestException('Selected learners must be a nonempty list without duplicates.');
    }
  }

  private classes(tx: CohortTx, tenantId: string) {
    return rows(tx, `SELECT section.id::text, section.name, section.academic_year_id::text, section.academic_level_id::text,
      section.capacity, section.curriculum_model, section.grade_level, level.order_index,
      year.name AS academic_year_name, year.starts_on::text AS year_starts_on, year.ends_on::text AS year_ends_on
      FROM class_sections section
      JOIN academic_years year ON year.tenant_id = section.tenant_id AND year.id::text = section.academic_year_id::text
      LEFT JOIN academic_levels level ON level.tenant_id = section.tenant_id AND level.id::text = section.academic_level_id::text
      WHERE section.tenant_id = $1 AND COALESCE(section.status, 'active') = 'active'
        AND COALESCE(year.status, 'active') NOT IN ('archived','inactive')
      ORDER BY year.starts_on, level.order_index, section.name`, [tenantId]);
  }

  private async roster(tx: CohortTx, tenantId: string, placement: CohortContext) {
    return rows(tx, `SELECT student.id::text, CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name) AS name,
        enrollment.id AS enrollment_id, enrollment.application_id, enrollment.class_name, enrollment.stream_name, enrollment.academic_year
      FROM students student
      LEFT JOIN LATERAL (SELECT academic.* FROM student_academic_enrollments academic
        WHERE academic.tenant_id = student.tenant_id AND academic.student_id::text = student.id::text AND academic.status = 'active'
        ORDER BY academic.created_at DESC LIMIT 1) enrollment ON TRUE
      WHERE student.tenant_id = $1 AND COALESCE(student.status, 'active') = 'active' AND (
        EXISTS (SELECT 1 FROM student_class_assignments membership WHERE membership.tenant_id = student.tenant_id
          AND membership.student_id::text = student.id::text AND membership.status = 'active'
          AND membership.class_section_id::text = $2 AND membership.stream_id::text IS NOT DISTINCT FROM $3::text)
        OR (enrollment.cohort_placement_id = $4 AND enrollment.status = 'active'))
      ORDER BY student.id`, [tenantId, placement.class_section_id, placement.stream_id, placement.id]);
  }

  private async plan(tx: CohortTx, actor: Actor, command: CohortPromotionCommandDto) {
    const blockers: string[] = []; const warnings: string[] = []; const moves: PlannedMove[] = [];
    const classes = new Map((await this.classes(tx, actor.tenantId)).map((section) => [section.id, section]));
    const sourceIds = new Set<string>(); const destinations = new Set<string>(); const selectedStudents = new Set<string>();
    for (const mapping of command.mappings) {
      if (sourceIds.has(mapping.source_placement_id)) { blockers.push('A source cohort may only appear once in a promotion batch.'); continue; }
      sourceIds.add(mapping.source_placement_id);
      const [source] = await rows<CohortContext>(tx, `SELECT * FROM academic_cohort_placements WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [actor.tenantId, mapping.source_placement_id]);
      if (!source || source.status !== 'active' || Number(source.version) !== mapping.expected_version) { blockers.push('A source cohort changed or was already promoted. Refresh promotion options.'); continue; }
      const target = classes.get(mapping.target_class_section_id); const origin = classes.get(source.class_section_id);
      if (!target || !origin) { blockers.push('Source and destination classes must be active in this school.'); continue; }
      if (!target.academic_level_id) { blockers.push(`${target.name} needs an academic level before promotion.`); continue; }
      if (date(target.year_starts_on) <= date(origin.year_starts_on)) { blockers.push(`${target.name} must belong to a later academic year.`); continue; }
      if (origin.order_index != null && target.order_index != null && Number(target.order_index) < Number(origin.order_index)) {
        blockers.push(`${target.name} is below the source academic level.`); continue;
      }
      const [stream] = mapping.target_stream_id ? await rows(tx, `SELECT id::text, name, capacity FROM class_streams
        WHERE tenant_id=$1 AND id::text=$2 AND class_section_id::text=$3 AND COALESCE(status,'active')='active'`, [actor.tenantId, mapping.target_stream_id, target.id]) : [];
      if (mapping.target_stream_id && !stream) { blockers.push('A destination stream does not belong to its selected class.'); continue; }
      const streams = await rows(tx, `SELECT id FROM class_streams WHERE tenant_id=$1 AND class_section_id::text=$2 AND COALESCE(status,'active')='active'`, [actor.tenantId, target.id]);
      if (!mapping.target_stream_id && streams.length) { blockers.push(`Select a destination stream for ${target.name}.`); continue; }
      const key = contextKey(target.id, mapping.target_stream_id);
      if (destinations.has(key)) { blockers.push('Different cohorts cannot be combined into one destination in a promotion batch.'); continue; }
      destinations.add(key);
      const roster = await this.roster(tx, actor.tenantId, source);
      const requested = mapping.student_ids ? new Set(mapping.student_ids) : null;
      const students = requested ? roster.filter((student) => requested.has(student.id)) : roster;
      if (requested && students.length !== requested.size) { blockers.push('Selected learners no longer all belong to the expected source cohort.'); continue; }
      if (students.some((student) => selectedStudents.has(student.id))) { blockers.push('A learner appears in more than one source mapping.'); continue; }
      students.forEach((student) => selectedStudents.add(student.id));
      if (!students.length) { blockers.push(`${origin.name} has no active learners to promote.`); continue; }
      if (students.some(student => !student.enrollment_id || !student.application_id)) {
        blockers.push(`${origin.name} has a learner without a complete active annual enrollment. Repair that enrollment before promotion.`); continue;
      }
      const full = students.length === roster.length;
      const [existingDestination] = await rows<CohortContext>(tx, `SELECT * FROM academic_cohort_placements
        WHERE tenant_id=$1 AND class_section_id=$2 AND stream_id IS NOT DISTINCT FROM $3::text AND status='active' FOR UPDATE`, [actor.tenantId, target.id, mapping.target_stream_id || null]);
      const snapshot = await captureCohortConfiguration(tx, actor.tenantId, source.id);
      const issues = await rows(tx, `SELECT id FROM academic_cohort_migration_issues WHERE tenant_id=$1
        AND (cohort_placement_id=$2 OR (cohort_placement_id IS NULL AND class_section_id=$3)) AND status='pending'`, [actor.tenantId, source.id,source.class_section_id]);
      if (issues.length) blockers.push(`${origin.name} has unresolved legacy teaching configuration conflicts.`);
      const capacity = stream?.capacity ?? target.capacity;
      if (capacity != null && students.length > Number(capacity)) blockers.push(`${target.name}${stream ? ` ${stream.name}` : ''} does not have enough capacity.`);
      if (!snapshot.subjects.length) warnings.push(`${origin.name} has no active subject configuration; the cohort will remain unconfigured.`);
      if (!full) warnings.push(`${students.length} learners will form a separate cohort; remaining learners keep their source configuration.`);
      moves.push({ mapping, source, target: { ...target, stream_name: stream?.name ?? 'Unstreamed',destination_capacity:capacity }, roster, students, full,
        existingDestination: existingDestination ?? null, snapshot });
    }
    for (const move of moves) {
      if (!move.existingDestination) continue;
      const departing = moves.find((candidate) => candidate.source.id === move.existingDestination!.id && candidate.full);
      if (departing) continue;
      const occupied = await this.roster(tx, actor.tenantId, move.existingDestination);
      const [related] = await rows(tx, `SELECT cohort.id FROM academic_cohorts cohort
        JOIN academic_cohort_placements placement ON placement.tenant_id=cohort.tenant_id AND placement.cohort_id=cohort.id
        WHERE cohort.tenant_id=$1 AND placement.id=$2 AND cohort.parent_cohort_id=$3 AND placement.source_placement_id=$4`,
      [actor.tenantId,move.existingDestination.id,move.source.cohort_id,move.source.id]);
      if (related && configurationIdentity(await captureCohortConfiguration(tx,actor.tenantId,move.existingDestination.id))===configurationIdentity(move.snapshot)) {
        move.continueDestination=true;
        if (move.target.destination_capacity != null && occupied.length+move.students.length>Number(move.target.destination_capacity)) blockers.push(`${move.target.name} does not have capacity for the additional learners.`);
      } else if (occupied.length) blockers.push(`${move.target.name} ${move.target.stream_name} already contains a cohort with a different teaching configuration. Promote that entire cohort in the same batch or choose another destination.`);
      else warnings.push(`The empty destination configuration for ${move.target.name} ${move.target.stream_name} will be preserved as completed history.`);
    }
    return { moves, warnings: [...new Set(warnings)], blockers: [...new Set(blockers)] };
  }

  private publicPlan(plan: { moves: PlannedMove[]; warnings: string[]; blockers: string[] }) {
    return { mappings: plan.moves.map((move) => ({ source_placement_id: move.source.id, cohort_id: move.source.cohort_id,
      source_class_section_id: move.source.class_section_id, source_stream_id: move.source.stream_id,
      target_class_section_id: move.target.id, target_stream_id: move.mapping.target_stream_id || null,
      target_class_section_name: move.target.name, target_stream_name: move.target.stream_name,
      student_count: move.students.length, subject_count: move.snapshot.subjects.filter(subject => subject.status === 'active').length, teacher_count: move.snapshot.teachers.length,
      partial: !move.full })), warnings: plan.warnings, blockers: plan.blockers, can_commit: plan.blockers.length === 0 };
  }

  private async promoteLearner(tx: CohortTx, actor: Actor, move: PlannedMove, target: CohortContext, student: Row, reason: string) {
    const [locked] = await rows(tx, `SELECT id FROM students WHERE tenant_id=$1 AND id::text=$2 FOR UPDATE`, [actor.tenantId, student.id]);
    if (!locked) throw new ConflictException('A learner changed during promotion.');
    const prior = await rows(tx, `SELECT * FROM student_academic_enrollments WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' FOR UPDATE`, [actor.tenantId, student.id]);
    if (prior.length > 1) throw new ConflictException('A learner has multiple active academic enrollments. Resolve them before promotion.');
    const duplicate = await rows(tx, `SELECT id FROM student_academic_enrollments WHERE tenant_id=$1 AND student_id::text=$2 AND academic_year=$3`, [actor.tenantId, student.id, move.target.academic_year_name]);
    if (duplicate.length) throw new ConflictException('A learner already has an enrollment in the destination year.');
    await rows(tx, `UPDATE student_class_assignments SET status='completed',updated_at=NOW()
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id`, [actor.tenantId, student.id]);
    await rows(tx, `UPDATE student_academic_enrollments SET status='completed',updated_at=NOW()
      WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' RETURNING id`, [actor.tenantId, student.id]);
    await rows(tx, `INSERT INTO student_class_assignments
      (school_id,tenant_id,student_id,class_section_id,stream_id,academic_level_id,academic_year_id,status,assigned_by_user_id,cohort_id,cohort_placement_id)
      VALUES ($1,$1,$2,$3,$4,$5,$6,'active',$7::uuid,$8,$9) RETURNING id`, [actor.tenantId, student.id, target.class_section_id,
      target.stream_id, move.target.academic_level_id, target.academic_year_id, actor.userId, target.cohort_id, target.id]);
    let enrollment: Row | null = null;
    if (prior[0]?.application_id) {
      [enrollment] = await rows(tx, `INSERT INTO student_academic_enrollments
        (tenant_id,student_id,application_id,class_section_id,stream_id,class_name,stream_name,academic_year,status,cohort_id,cohort_placement_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10) RETURNING *`, [actor.tenantId, student.id, prior[0].application_id,
        target.class_section_id,target.stream_id,move.target.name,move.target.stream_name,move.target.academic_year_name,target.cohort_id,target.id]);
      const [lifecycle] = await rows(tx, `INSERT INTO student_academic_lifecycle_events
        (tenant_id,student_id,source_enrollment_id,target_enrollment_id,event_type,from_class_name,from_stream_name,from_academic_year,
          to_class_section_id,to_class_name,to_stream_name,to_academic_year,reason,created_by_user_id)
        VALUES ($1,$2,$3,$4,'promotion',$5,$6,$7,$8,$9,$10,$11,$12,$13::uuid) RETURNING id`, [actor.tenantId,student.id,
        prior[0].id,enrollment!.id,prior[0].class_name,prior[0].stream_name,prior[0].academic_year,target.class_section_id,
        move.target.name,move.target.stream_name,move.target.academic_year_name,reason,actor.userId]);
      await this.events.publish({
        event_name: 'student.academic_enrollment.created',
        event_key: `student.academic_enrollment.created:${enrollment!.id}`,
        aggregate_type: 'student_academic_enrollment', aggregate_id: enrollment!.id,
        tenant_id: actor.tenantId,
        payload: {tenant_id: actor.tenantId, student_id: student.id, academic_enrollment_id: enrollment!.id,
          application_id: prior[0].application_id, class_section_id: target.class_section_id,
          class_name: move.target.name, stream_name: move.target.stream_name,
          academic_year: move.target.academic_year_name, status: 'active', occurred_at: new Date().toISOString()},
      }, tx);
      await this.events.publish({
        event_name: 'student.academic_lifecycle.changed',
        event_key: `student.academic_lifecycle.changed:${lifecycle.id}`,
        aggregate_type: 'student_academic_lifecycle_event', aggregate_id: lifecycle.id,
        tenant_id: actor.tenantId,
        payload: {tenant_id: actor.tenantId, student_id: student.id, lifecycle_event_id: lifecycle.id,
          event_type: 'promotion', source_enrollment_id: prior[0].id, target_enrollment_id: enrollment!.id,
          from_class_name: prior[0].class_name, from_stream_name: prior[0].stream_name,
          from_academic_year: prior[0].academic_year, to_class_name: move.target.name,
          to_stream_name: move.target.stream_name, to_academic_year: move.target.academic_year_name,
          reason, occurred_at: new Date().toISOString()},
      }, tx);
    }
    await updateStudentCohortPosition(tx, actor, student.id, target, move.target);
    await updateStudentCohortSubjects(tx, actor, student.id, target, enrollment, move.snapshot.subjects);
  }

  private async recordChange(tx: CohortTx, actor: Actor, command: CohortPromotionCommandDto, move: PlannedMove, target: CohortContext, result: Row, teachers: Row[]) {
    await rows(tx, `INSERT INTO academic_audit_logs (school_id,tenant_id,entity_type,entity_id,action,actor_user_id,actor_role,previous_values,new_values,reason,metadata)
      VALUES ($1,$1,'academic_cohort',$2,'academics.cohort_promoted',$3::uuid,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb) RETURNING id`,
    [actor.tenantId,target.cohort_id,actor.userId,actor.role ?? null,JSON.stringify(move.source),JSON.stringify(target),command.reason,
      JSON.stringify({ request_id:command.request_id,...result })]);
    await this.events.publish({event_name:'academic.cohort.promoted',event_key:`academic.cohort.promoted:${command.request_id}:${move.source.id}`,
      aggregate_type:'academic_cohort',aggregate_id:target.cohort_id,tenant_id:actor.tenantId,
      payload:{tenant_id:actor.tenantId,entity_type:'academic_cohort',entity_id:target.cohort_id,
        action:'promoted',version:Number(target.version),occurred_at:new Date().toISOString(),
        previous_values:{...move.source},new_values:{...target},reason:command.reason,
        metadata:{actor_user_id:actor.userId,actor_role:actor.role,...result}}},tx);
    for (const teacherId of new Set(teachers.map((item) => String(item.teacher_user_id)))) {
      await rows(tx, `INSERT INTO notifications (tenant_id,notification_key,recipient_user_id,type,title,body,priority,source_module,source_record_id,metadata)
        VALUES ($1,$2,$3::uuid,'academic_assignment','Teaching cohort promoted',$4,'normal','academics',$5,$6::jsonb)
        ON CONFLICT (tenant_id,notification_key) DO NOTHING RETURNING id`, [actor.tenantId,`cohort-promotion:${command.request_id}:${target.id}:${teacherId}`,
        teacherId,`Your teaching configuration continues with the cohort in ${move.target.name} ${move.target.stream_name}.`,target.id,JSON.stringify(result)]);
    }
  }

  async promoteSingle(actor: Actor, studentId: string, dto: AdvanceAcademicLifecycleDto) {
    return this.transaction(actor, async (tx) => {
      let source: CohortContext | undefined;
      if (dto.source_placement_id) [source] = await rows<CohortContext>(tx, `SELECT * FROM academic_cohort_placements WHERE tenant_id=$1 AND id=$2`, [actor.tenantId,dto.source_placement_id]);
      else [source] = await rows<CohortContext>(tx, `SELECT placement.* FROM academic_cohort_placements placement
        JOIN student_class_assignments membership ON membership.tenant_id=placement.tenant_id AND membership.cohort_placement_id=placement.id
        WHERE placement.tenant_id=$1 AND membership.student_id::text=$2 AND membership.status='active' AND placement.status='active'`, [actor.tenantId,studentId]);
      if (!source) throw new NotFoundException('An active canonical cohort placement was not found for this learner.');
      let targetClassId = dto.target_class_section_id; let streamId = dto.target_stream_id || null;
      if (!targetClassId) {
        const candidates = await rows(tx, `SELECT section.id::text, stream.id::text AS stream_id FROM class_sections section
          JOIN academic_years year ON year.tenant_id=section.tenant_id AND year.id::text=section.academic_year_id::text
          JOIN academic_years origin ON origin.tenant_id=section.tenant_id AND origin.id::text=$4
          LEFT JOIN class_streams stream ON stream.tenant_id=section.tenant_id AND stream.class_section_id::text=section.id::text
          WHERE section.tenant_id=$1 AND lower(section.name)=lower($2) AND lower(COALESCE(stream.name,'Unstreamed'))=lower($3)
            AND year.starts_on>origin.starts_on AND COALESCE(section.status,'active')='active'`, [actor.tenantId,dto.class_name ?? '',dto.stream_name ?? 'Unstreamed',source.academic_year_id]);
        if (candidates.length !== 1) throw new BadRequestException('Select destination class and stream IDs; the legacy names are missing or ambiguous.');
        targetClassId=candidates[0].id; streamId=candidates[0].stream_id;
      }
      const command = {request_id:dto.request_id || `single:${studentId}:${source.id}:${targetClassId}:${streamId ?? ''}`,
        reason:dto.reason?.trim() || 'Annual student promotion',mappings:[{source_placement_id:source.id,
          expected_version:dto.expected_version ?? Number(source.version),student_ids:[studentId],target_class_section_id:targetClassId!,target_stream_id:streamId}]};
      this.validateCommand(command);
      return this.commitInTransaction(tx,actor,command);
    });
  }
}
