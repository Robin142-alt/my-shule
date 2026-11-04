import { BadRequestException } from '@nestjs/common';
import { CohortTx, ensureCohortContexts } from '../academics/cohort-configuration';
import { updateStudentCohortPosition } from '../academics/cohort-enrollment';
import { EventPublisherService } from '../events/event-publisher.service';
import { recordProgressionOperation } from './progression-journal';
import { ProgressionActor, query, readStudentState, requireCompleteEnrollment, StudentState } from './progression-store';

const same = (a: unknown, b: unknown) => (a == null ? null : String(a)) === (b == null ? null : String(b));
const name = (value: unknown) => String(value ?? '').trim().toLowerCase();

/** Repair projections only when canonical IDs/names or an immutable transition agree.
 * The caller holds the school lock and student lock. Never choose between competing placements.
 */
export async function reconcileEnrollment(tx: CohortTx, events: EventPublisherService, actor: ProgressionActor,
  current: StudentState): Promise<StudentState> {
  const { enrollment: e, student } = current;
  const p=current.placement?{...current.placement}:null;
  const review = () => { throw new BadRequestException('The learner’s enrollment and placement have conflicting evidence. Review the admission record and progression history before retrying.'); };
  if (current.state.assignments.length !== 1 || current.state.enrollments.length !== 1 || !e?.application_id) {
    requireCompleteEnrollment(current);
  }
  if (!p || !e) return review();
  // Existing non-null student pointers are evidence, not values to silently overwrite.
  if ((student.current_class_id && !same(student.current_class_id, p.class_section_id))
    || (student.current_stream_id && !same(student.current_stream_id, p.stream_id))) return review();
  const [section] = await query(tx, `SELECT section.*,year.name AS year_name,stream.name AS stream_name
    FROM class_sections section JOIN academic_years year ON year.tenant_id=section.tenant_id AND year.id::text=section.academic_year_id::text
    LEFT JOIN class_streams stream ON stream.tenant_id=section.tenant_id AND stream.class_section_id::text=section.id::text AND stream.id::text=$3
    WHERE section.tenant_id=$1 AND section.id::text=$2`, actor.tenantId, p.class_section_id, p.stream_id ?? null);
  if (!section || !same(section.academic_year_id, p.academic_year_id) || (p.stream_id && !section.stream_name)) return review();
  const latestPlacement = current.latest?.after_state?.assignments;
  const latestEnrollment = current.latest?.after_state?.enrollments;
  const audited = latestPlacement?.length === 1 && latestEnrollment?.length === 1
    && same(latestPlacement[0].id, p.id) && same(latestPlacement[0].class_section_id, p.class_section_id)
    && same(latestPlacement[0].stream_id, p.stream_id) && same(latestPlacement[0].academic_year_id, p.academic_year_id)
    && same(latestEnrollment[0].id, e.id) && same(latestEnrollment[0].class_section_id, p.class_section_id)
    && same(latestEnrollment[0].stream_id, p.stream_id);
  const identifiersAgree = (!e.class_section_id || same(e.class_section_id, p.class_section_id))
    && (!e.stream_id || same(e.stream_id, p.stream_id))
    && (!e.academic_year_id || same(e.academic_year_id, p.academic_year_id))
    && (!e.cohort_placement_id || !p.cohort_placement_id || same(e.cohort_placement_id, p.cohort_placement_id));
  const namesAgree = name(e.class_name) === name(section.name) && name(e.academic_year) === name(section.year_name)
    && (p.stream_id ? name(e.stream_name) === name(section.stream_name) : ['', 'unstreamed', 'none'].includes(name(e.stream_name)));
  if (!audited && !(identifiersAgree && namesAgree)) return review();
  // Never rewrite an older year's enrollment as a later year, even if a current pointer drifted.
  if (name(e.academic_year) !== name(section.year_name) || (e.academic_year_id && !same(e.academic_year_id, p.academic_year_id))) return review();
  const contexts = await ensureCohortContexts(tx, actor.tenantId, String(p.class_section_id), p.stream_id ?? null);
  let context = contexts.find(row => same(row.stream_id, p.stream_id));
  let inferredStream=false;
  if(!context&&!p.stream_id&&!e.stream_id&&!student.current_stream_id&&contexts.length===1) {
    // There is only one configured destination: no arbitrary Red/Yellow choice.
    context=contexts[0];p.stream_id=context.stream_id;inferredStream=true;
    const [stream]=await query(tx,'SELECT name FROM class_streams WHERE tenant_id=$1 AND id::text=$2',actor.tenantId,p.stream_id);
    section.stream_name=stream.name;
  }
  if (!context) throw new BadRequestException('This class has streams but the learner has no confirmed stream. Choose the correct stream in Change class or stream.');
  const changed = !same(e.class_section_id, p.class_section_id) || !same(e.stream_id, p.stream_id)
    || !same(e.academic_year_id, p.academic_year_id) || !same(e.cohort_placement_id, context.id)
    || !same(p.cohort_placement_id, context.id) || !same(student.current_class_id, p.class_section_id)
    || !same(student.current_stream_id, p.stream_id) || !namesAgree;
  if (!changed) { requireCompleteEnrollment(current); return current; }
  const applications = await query(tx, `SELECT id FROM admission_applications WHERE tenant_id=$1 AND id::text=$2
    AND admitted_student_id::text=$3`, actor.tenantId, e.application_id, student.id);
  if (applications.length !== 1) return review();
  await query(tx, `UPDATE student_academic_enrollments SET class_section_id=$3,stream_id=$4,academic_year_id=$5,
    class_name=$6,stream_name=$7,cohort_id=$8,cohort_placement_id=$9,updated_at=NOW()
    WHERE tenant_id=$1 AND id::text=$2 RETURNING id`, actor.tenantId, e.id, p.class_section_id, p.stream_id ?? null,
  p.academic_year_id, section.name, section.stream_name ?? 'Unstreamed', context.cohort_id, context.id);
  await query(tx, `UPDATE student_class_assignments SET cohort_id=$3,cohort_placement_id=$4,stream_id=$5,updated_at=NOW()
    WHERE tenant_id=$1 AND id::text=$2 RETURNING id`, actor.tenantId, p.id, context.cohort_id, context.id,p.stream_id??null);
  await query(tx, `UPDATE student_subject_enrollments SET class_section_id=$3,stream_id=$4,academic_year_id=$5,updated_at=NOW()
    WHERE tenant_id=$1 AND student_id::text=$2 AND academic_enrollment_id::text=$6 AND status='active' RETURNING id`,
  actor.tenantId, student.id, p.class_section_id, p.stream_id ?? null, p.academic_year_id, e.id);
  await query(tx, `UPDATE student_allocations SET class_name=$3,stream_name=$4,updated_at=NOW()
    WHERE tenant_id=$1 AND student_id::text=$2 AND is_current RETURNING id`, actor.tenantId, student.id, section.name, section.stream_name ?? 'Unstreamed');
  await updateStudentCohortPosition(tx, actor, student.id, context, section);
  const repaired = await readStudentState(tx, actor.tenantId, student.id);
  requireCompleteEnrollment(repaired);
  await recordProgressionOperation(tx, events, actor, 'enrollment.reconciled', student.id,
    'Synchronized verified current enrollment identifiers; historical records retained.',
    { evidence: inferredStream?'only_configured_stream':audited ? 'immutable_transition' : 'matching_placement_and_enrollment', before_state: current.state, after_state: repaired.state });
  return repaired;
}
