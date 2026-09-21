import { BadRequestException, Injectable } from '@nestjs/common';
import { balanceRequirements, sameTeachingGroup, uncoveredTeachingCells } from './timetable-balance';

import {
  GeneratedGap,
  GeneratedPlacement,
  TimetableWorkflowRepository,
} from './repositories/timetable-workflow.repository';

export interface TimetableConflictDetail {
  code: string;
  message: string;
  slot_ids?: string[];
  requirement_id?: string;
}

export interface TimetableCandidate {
  day_of_week: number;
  period_id: string;
  period_ids: string[];
  starts_at: string;
  ends_at: string;
  state: 'VALID' | 'PREFERRED';
  score: number;
  reasons: string[];
}

interface PlacementLike {
  id?: string;
  requirement_id?: string;
  class_section_id: string;
  stream_id?: string | null;
  subject_id: string;
  teacher_id: string;
  resource_id?: string | null;
  parallel_key?: string | null;
  day_of_week: number;
  period_id?: string | null;
  starts_at: string;
  ends_at: string;
  duration_periods?: number;
  locked?: boolean;
}

@Injectable()
export class TimetableConstraintService {
  constructor(private readonly workflowRepository: TimetableWorkflowRepository) {}

  async readiness(tenantId: string, academicYear: string, termName: string) {
    const metrics = await this.workflowRepository.getReadinessSnapshot(tenantId, academicYear, termName);
    const blockers: any[] = [];
    const warnings: any[] = [];
    const issue = (code: string, severity: 'BLOCKER' | 'WARNING', message: string, actionUrl?: string) => ({
      code,
      severity,
      message,
      action_url: actionUrl,
    });

    if (!metrics.academic_year) blockers.push(issue('ACADEMIC_YEAR_MISSING', 'BLOCKER', 'Select an academic year configured for this school.', '/school/deputy-principal/academics'));
    if (!metrics.term) blockers.push(issue('TERM_MISSING', 'BLOCKER', 'Select a term that belongs to the academic year.', '/school/deputy-principal/academics'));
    if (Number(metrics.teaching_days ?? 0) === 0) blockers.push(issue('TEACHING_DAYS_MISSING', 'BLOCKER', 'Configure at least one teaching day before generating a timetable.'));
    if (Number(metrics.teaching_periods ?? 0) === 0) blockers.push(issue('TEACHING_PERIODS_MISSING', 'BLOCKER', 'Configure teaching periods before generating a timetable.'));
    if (Number(metrics.classes ?? 0) === 0) blockers.push(issue('CLASSES_MISSING', 'BLOCKER', 'Create the classes or forms that need a timetable.', '/school/deputy-principal/academics'));
    if (Number(metrics.subjects ?? 0) === 0) blockers.push(issue('SUBJECTS_MISSING', 'BLOCKER', 'Create active subjects before generating a timetable.', '/school/deputy-principal/academics'));
    if (Number(metrics.active_teachers ?? 0) === 0) blockers.push(issue('TEACHER_ALLOCATIONS_MISSING', 'BLOCKER', 'Assign teachers to subjects and classes before generating.', '/school/deputy-principal/academics'));
    if (Number(metrics.requirements ?? 0) === 0) blockers.push(issue('SUBJECT_REQUIREMENTS_MISSING', 'BLOCKER', 'Set weekly subject period requirements before generating.'));
    if (Number(metrics.invalid_allocations ?? 0) > 0) {
      const details = (metrics.allocation_issues ?? []).map((requirement: any) => ({
        requirement_id: requirement.id,
        class_name: requirement.class_name,
        stream_name: requirement.stream_name,
        subject_name: requirement.subject_name,
        reason: requirement.allocation_status === 'stream_required'
          ? 'Teachers are already allocated to multiple streams. Choose the stream in subject requirements.'
          : requirement.allocation_status === 'ambiguous'
          ? 'More than one teacher is allocated. Select the allocated teacher in subject requirements.'
          : 'No active allocation matches this class, subject and stream in the selected term.',
      }));
      blockers.push({ ...issue('INVALID_TEACHER_ALLOCATIONS', 'BLOCKER', `${metrics.invalid_allocations} subject requirement(s) need their teaching allocation reviewed.`, '/school/deputy-principal/academics'), details });
    }
    if (Number(metrics.required_lessons ?? 0) > Number(metrics.teaching_periods ?? 0) * Math.max(1, Number(metrics.classes ?? 0))) {
      warnings.push(issue('CAPACITY_PRESSURE', 'WARNING', 'Required weekly periods are close to or above the configured class timetable capacity.'));
    }

    const snapshot = await this.getSnapshot(tenantId, academicYear, termName);
    for (const problem of snapshot.balance_issues) blockers.push(issue(problem.code, 'BLOCKER', problem.message));
    return {
      status: blockers.length > 0 ? 'BLOCKER' : warnings.length > 0 ? 'WARNING' : 'READY',
      blockers,
      warnings,
      checks: {
        academic_year: Boolean(metrics.academic_year),
        term: Boolean(metrics.term),
        periods: Number(metrics.teaching_periods ?? 0) > 0,
        classes: Number(metrics.classes ?? 0) > 0,
        subjects: Number(metrics.subjects ?? 0) > 0,
        teacher_allocations: Number(metrics.active_teachers ?? 0) > 0 && Number(metrics.invalid_allocations ?? 0) === 0,
        requirements: Number(metrics.requirements ?? 0) > 0,
        resources: true,
      },
      metrics: {
        teaching_days: Number(metrics.teaching_days ?? 0),
        teaching_periods: Number(metrics.teaching_periods ?? 0),
        classes: Number(metrics.classes ?? 0),
        active_teachers: Number(metrics.active_teachers ?? 0),
        requirements: Number(metrics.requirements ?? 0),
        required_lessons: snapshot.requirements.reduce((sum: number, row: any) => sum + Number(row.periods_per_week), 0),
      },
    };
  }

  async getSnapshot(tenantId: string, academicYear: string, termName: string, versionId?: string) {
    const snapshot = await this.workflowRepository.getConstraintSnapshot(tenantId, academicYear, termName, versionId);
    const balanced = balanceRequirements(snapshot);
    return { ...snapshot, requirements: balanced.requirements, balance_issues: balanced.issues };
  }

  validatePlacement(snapshot: any, placement: PlacementLike, excludeSlotId?: string): TimetableConflictDetail[] {
    const conflicts: TimetableConflictDetail[] = [];
    const configuration = snapshot.configuration;
    if (!configuration) {
      return [{ code: 'CONFIGURATION_MISSING', message: 'Timetable period configuration is missing.' }];
    }

    const configuredDay = (configuration.days ?? []).find(
      (item: any) => Number(item.day_of_week) === Number(placement.day_of_week),
    );
    const resolvedPeriodId = placement.period_id
      ?? (configuredDay?.periods ?? []).find(
        (period: any) => this.time(period.starts_at) === this.time(placement.starts_at),
      )?.id;
    const periodSequence = this.periodSequence(
      configuration,
      placement.day_of_week,
      resolvedPeriodId,
      placement.duration_periods ?? 1,
    );
    if (periodSequence.length !== Number(placement.duration_periods ?? 1)) {
      conflicts.push({
        code: 'INVALID_CONSECUTIVE_PERIODS',
        message: 'The selected start period does not have enough consecutive teaching periods.',
      });
    } else {
      if (this.time(periodSequence[0].starts_at) !== this.time(placement.starts_at)
        || this.time(periodSequence[periodSequence.length - 1].ends_at) !== this.time(placement.ends_at)) {
        conflicts.push({
          code: 'PERIOD_TIME_MISMATCH',
          message: 'The lesson time does not match its configured start period and duration.',
        });
      }
      const nonTeaching = periodSequence.find((period) => !period.is_teaching);
      if (nonTeaching) {
        conflicts.push({ code: 'NON_TEACHING_PERIOD', message: `${nonTeaching.name} is configured as a non-teaching period.` });
      }
      for (let index = 1; index < periodSequence.length; index += 1) {
        if (this.time(periodSequence[index - 1].ends_at) !== this.time(periodSequence[index].starts_at)) {
          conflicts.push({
            code: 'INVALID_CONSECUTIVE_PERIODS',
            message: 'Consecutive lessons cannot cross a break or a gap in the school day.',
          });
          break;
        }
      }
    }

    const assignmentValid = snapshot.assignments.some((assignment: any) =>
      String(assignment.class_section_id) === String(placement.class_section_id)
      && String(assignment.subject_id) === String(placement.subject_id)
      && String(assignment.teacher_id) === String(placement.teacher_id)
      && (!assignment.stream_id || String(assignment.stream_id) === String(placement.stream_id)),
    );
    if (!assignmentValid) {
      conflicts.push({
        code: 'INVALID_TEACHER_ALLOCATION',
        message: 'The selected teacher is not currently allocated to this subject and class or stream.',
      });
    }

    if (placement.resource_id && !snapshot.resources.some((resource: any) => String(resource.id) === String(placement.resource_id) && resource.status === 'active')) {
      conflicts.push({ code: 'INVALID_RESOURCE', message: 'The selected exclusive resource is not active in this school.' });
    }

    const periodIds = new Set(periodSequence.map((period) => String(period.id)));
    const unavailable = snapshot.availability.find((availability: any) =>
      String(availability.teacher_id) === String(placement.teacher_id)
      && Number(availability.day_of_week) === Number(placement.day_of_week)
      && periodIds.has(String(availability.period_id))
      && ['unavailable', 'protected'].includes(String(availability.state)),
    );
    if (unavailable) {
      conflicts.push({
        code: unavailable.state === 'protected' ? 'TEACHER_PROTECTED_PERIOD' : 'TEACHER_UNAVAILABLE',
        message: unavailable.reason || 'The teacher is unavailable during the selected period.',
      });
    }

    const candidateStart = this.time(placement.starts_at);
    const candidateEnd = this.time(placement.ends_at);
    for (const existing of snapshot.slots as any[]) {
      if (excludeSlotId && String(existing.id) === String(excludeSlotId)) continue;
      if (Number(existing.day_of_week) !== Number(placement.day_of_week)) continue;
      if (!this.overlaps(candidateStart, candidateEnd, this.time(existing.starts_at), this.time(existing.ends_at))) continue;
      const slotIds = [String(existing.id)];
      if (String(existing.teacher_id) === String(placement.teacher_id)) {
        conflicts.push({ code: 'TEACHER_CLASH', message: 'The teacher already has another lesson at this time.', slot_ids: slotIds });
      }
      const sameParallelGroup = Boolean(placement.parallel_key)
        && String(existing.parallel_key ?? '') === String(placement.parallel_key);
      if (sameTeachingGroup(existing, placement) && !sameParallelGroup) {
        conflicts.push({ code: 'CLASS_CLASH', message: 'The class already has another lesson at this time.', slot_ids: slotIds });
      }
      if (placement.stream_id && existing.stream_id
        && String(existing.stream_id) === String(placement.stream_id) && !sameParallelGroup) {
        conflicts.push({ code: 'STREAM_CLASH', message: 'The stream already has another lesson at this time.', slot_ids: slotIds });
      }
      const selectedResource = placement.resource_id
        ? snapshot.resources.find((resource: any) => String(resource.id) === String(placement.resource_id))
        : null;
      if (selectedResource?.is_exclusive && existing.resource_id
        && String(existing.resource_id) === String(placement.resource_id)) {
        conflicts.push({ code: 'RESOURCE_CLASH', message: 'The exclusive resource is already in use at this time.', slot_ids: slotIds });
      }
      if (existing.locked && conflicts.some((conflict) => conflict.slot_ids?.includes(String(existing.id)))) {
        conflicts.push({ code: 'LOCKED_LESSON_CONFLICT', message: 'The proposed change conflicts with a locked lesson.', slot_ids: slotIds });
      }
    }

    for (const block of configuration.common_blocks ?? []) {
      if (Number(block.day_of_week) !== Number(placement.day_of_week)) continue;
      if (!this.blockApplies(block, placement)) continue;
      const blockPeriods = this.periodSequence(configuration, Number(block.day_of_week), String(block.period_id), Number(block.duration_periods || 1));
      if (blockPeriods.some((period) => periodIds.has(String(period.id)))) {
        conflicts.push({
          code: 'COMMON_BLOCK_CONFLICT',
          message: `${block.name} occupies this period for the selected class or stream.`,
        });
      }
    }

    const unique = new Map<string, TimetableConflictDetail>();
    for (const conflict of conflicts) {
      const key = `${conflict.code}:${(conflict.slot_ids ?? []).join(',')}:${conflict.message}`;
      unique.set(key, conflict);
    }
    return [...unique.values()];
  }

  validateVersion(snapshot: any, unscheduledCount = 0) {
    const hardConflicts: TimetableConflictDetail[] = [];
    hardConflicts.push(...(snapshot.balance_issues ?? []));
    const emptyPeriods = uncoveredTeachingCells(snapshot);
    if (emptyPeriods.length) hardConflicts.push({ code: 'EMPTY_TEACHING_PERIODS', message: `${emptyPeriods.length} teaching period(s) still need lessons. Regenerate the full timetable before publishing.` });
    for (const slot of snapshot.slots as any[]) {
      hardConflicts.push(...this.validatePlacement(snapshot, slot, String(slot.id)).map((conflict) => ({
        ...conflict,
        slot_ids: [...new Set([String(slot.id), ...(conflict.slot_ids ?? [])])],
      })));
    }
    const unique = new Map<string, TimetableConflictDetail>();
    for (const conflict of hardConflicts) {
      const ids = [...(conflict.slot_ids ?? [])].sort();
      unique.set(`${conflict.code}:${ids.join(',')}`, { ...conflict, slot_ids: ids });
    }
    const activeRequirements = (snapshot.requirements ?? []).filter(
      (requirement: any) => String(requirement.status ?? 'active') === 'active',
    );
    const scheduledRequirementPeriods = activeRequirements.reduce((total: number, requirement: any) => {
      const scheduled = (snapshot.slots ?? [])
        .filter((slot: any) => {
          if (slot.requirement_id) return String(slot.requirement_id) === String(requirement.id);
          return String(slot.class_section_id) === String(requirement.class_section_id)
            && String(slot.stream_id ?? '') === String(requirement.stream_id ?? '')
            && String(slot.subject_id) === String(requirement.subject_id)
            && String(slot.teacher_id) === String(requirement.teacher_id)
            && String(slot.parallel_key ?? '') === String(requirement.parallel_key ?? '');
        })
        .reduce((sum: number, slot: any) => sum + Number(slot.duration_periods ?? 1), 0);
      return total + Math.min(Number(requirement.periods_per_week ?? 0), scheduled);
    }, 0);
    const requiredLessons = activeRequirements.reduce(
      (sum: number, requirement: any) => sum + Number(requirement.periods_per_week ?? 0),
      0,
    );
    const uncoveredRequirements = Math.max(0, requiredLessons - scheduledRequirementPeriods);
    const unresolvedLessons = Math.max(Number(unscheduledCount ?? 0), uncoveredRequirements);
    const warnings = unresolvedLessons > 0
      ? [{ code: 'UNSCHEDULED_LESSONS', message: `${unresolvedLessons} required lesson period(s) remain unscheduled.` }]
      : [];
    return {
      valid: unique.size === 0,
      hard_conflicts: [...unique.values()],
      warnings,
      summary: {
        slots: snapshot.slots.length,
        required_lessons: requiredLessons,
        scheduled_required_lessons: scheduledRequirementPeriods,
        hard_conflicts: unique.size,
        warnings: warnings.length,
        unscheduled: unresolvedLessons,
        empty_teaching_periods: emptyPeriods.length,
      },
    };
  }

  findValidSlots(snapshot: any, request: any, excludeSlotId?: string): { items: TimetableCandidate[]; best: TimetableCandidate | null } {
    if (!snapshot.configuration) return { items: [], best: null };
    const candidates: TimetableCandidate[] = [];
    const days = [...(snapshot.configuration.days ?? [])].sort((left: any, right: any) =>
      Number(left.order_index) - Number(right.order_index) || Number(left.day_of_week) - Number(right.day_of_week));

    for (const day of days) {
      if (!day.is_teaching_day) continue;
      const periods = [...(day.periods ?? [])].sort((left: any, right: any) => Number(left.order_index) - Number(right.order_index));
      for (const period of periods) {
        if (!period.is_teaching) continue;
        const sequence = this.periodSequence(snapshot.configuration, Number(day.day_of_week), String(period.id), Number(request.duration_periods || 1));
        if (sequence.length !== Number(request.duration_periods || 1)) continue;
        const placement: PlacementLike = {
          ...request,
          day_of_week: Number(day.day_of_week),
          period_id: String(period.id),
          starts_at: String(sequence[0].starts_at),
          ends_at: String(sequence[sequence.length - 1].ends_at),
        };
        if (this.validatePlacement(snapshot, placement, excludeSlotId).length > 0) continue;
        const soft = this.score(snapshot, placement, sequence);
        candidates.push({
          day_of_week: placement.day_of_week,
          period_id: String(period.id),
          period_ids: sequence.map((item) => String(item.id)),
          starts_at: placement.starts_at,
          ends_at: placement.ends_at,
          state: soft.preferred ? 'PREFERRED' : 'VALID',
          score: soft.score,
          reasons: soft.reasons,
        });
      }
    }
    candidates.sort((left, right) =>
      right.score - left.score
      || left.day_of_week - right.day_of_week
      || this.time(left.starts_at) - this.time(right.starts_at)
      || left.period_id.localeCompare(right.period_id));
    return { items: candidates, best: candidates[0] ?? null };
  }

  findSwapSlots(snapshot: any, source: any) {
    if (source.locked || source.parallel_key) return [];
    return snapshot.slots.filter((target: any) => target.id !== source.id && !target.locked && !target.parallel_key
      && target.class_section_id === source.class_section_id && (target.stream_id ?? null) === (source.stream_id ?? null)
      && Number(target.duration_periods || 1) === Number(source.duration_periods || 1)).flatMap((target: any) => {
        const timing = (slot: any) => ({ day_of_week: Number(slot.day_of_week), period_id: slot.period_id, starts_at: slot.starts_at, ends_at: slot.ends_at });
        const moved = { ...source, ...timing(target) };
        const exchanged = { ...target, ...timing(source) };
        const rest = { ...snapshot, slots: snapshot.slots.filter((slot: any) => slot.id !== source.id && slot.id !== target.id) };
        if (this.validatePlacement(rest, moved).length || this.validatePlacement(rest, exchanged).length) return [];
        const name = snapshot.requirements.find((row: any) => row.id === target.requirement_id)?.subject_name || target.subject_id;
        return [{ ...timing(target), period_ids: [target.period_id], state: 'VALID' as const, score: 100,
          swap_slot_id: target.id, swap_subject_name: name, reasons: [`Swap with ${name}; both teachers and lesson times have been checked.`] }];
      });
  }

  generate(snapshot: any): { placements: GeneratedPlacement[]; gaps: GeneratedGap[]; warnings: any[] } {
    let best = this.generateAttempt(snapshot, 0);
    for (let attempt = 1; best.gaps.length && attempt < 12; attempt += 1) {
      const candidate = this.generateAttempt(snapshot, attempt);
      if (candidate.gaps.reduce((sum, gap) => sum + gap.remaining_periods, 0) < best.gaps.reduce((sum, gap) => sum + gap.remaining_periods, 0)) best = candidate;
    }
    return best;
  }

  private generateAttempt(snapshot: any, attempt: number): { placements: GeneratedPlacement[]; gaps: GeneratedGap[]; warnings: any[] } {
    const placements: GeneratedPlacement[] = [];
    const gaps: GeneratedGap[] = [];
    const warnings: any[] = [];
    const workingSnapshot = {
      ...snapshot,
      slots: [...(snapshot.slots ?? [])],
    };
    const requirements = [...(snapshot.requirements ?? [])].filter((requirement: any) => requirement.status === 'active');
    requirements.sort((left: any, right: any) =>
      Number(Boolean(right.resource_id)) - Number(Boolean(left.resource_id))
      || Number(right.duration_periods) - Number(left.duration_periods)
      || Number(right.periods_per_week) - Number(left.periods_per_week)
      || String(left.class_section_id).localeCompare(String(right.class_section_id))
      || String(left.subject_id).localeCompare(String(right.subject_id))
      || String(left.id).localeCompare(String(right.id)));
    // Try alternate orders when scarce teachers or double lessons make a greedy
    // first pass incomplete. Every alternative still uses the same hard checks.
    if (attempt && requirements.length) requirements.push(...requirements.splice(0, attempt % requirements.length));

    for (const requirement of requirements) {
      let remaining = Number(requirement.periods_per_week);
      const configuredDuration = Math.max(1, Number(requirement.duration_periods || 1));
      if (!requirement.teacher_id) {
        gaps.push({
          requirement_id: String(requirement.id),
          remaining_periods: remaining,
          duration_periods: configuredDuration,
          reason_code: 'TEACHER_NOT_ALLOCATED',
          reason_message: 'No active teacher allocation is available for this subject requirement.',
        });
        continue;
      }
      while (remaining > 0) {
        const duration = Math.min(configuredDuration, remaining);
        const request = {
          requirement_id: String(requirement.id),
          class_section_id: String(requirement.class_section_id),
          stream_id: requirement.stream_id ?? null,
          subject_id: String(requirement.subject_id),
          teacher_id: String(requirement.teacher_id),
          resource_id: requirement.resource_id ?? null,
          parallel_key: requirement.parallel_key ?? null,
          duration_periods: duration,
          preferred_days: requirement.preferred_days ?? [],
          preferred_start_period_ids: requirement.preferred_start_period_ids ?? [],
        };
        const candidate = this.findValidSlots(workingSnapshot, request).best;
        if (!candidate) break;
        const placement: GeneratedPlacement = {
          requirement_id: String(requirement.id),
          class_section_id: request.class_section_id,
          stream_id: request.stream_id,
          subject_id: request.subject_id,
          teacher_id: request.teacher_id,
          resource_id: request.resource_id,
          parallel_key: request.parallel_key,
          day_of_week: candidate.day_of_week,
          period_id: candidate.period_id,
          starts_at: candidate.starts_at,
          ends_at: candidate.ends_at,
          duration_periods: duration,
          locked: false,
        };
        placements.push(placement);
        workingSnapshot.slots.push({ id: `generated:${placements.length}`, ...placement, source_kind: 'generated', status: 'draft' });
        remaining -= duration;
      }
      if (remaining > 0) {
        gaps.push({
          requirement_id: String(requirement.id),
          remaining_periods: remaining,
          duration_periods: Math.min(configuredDuration, remaining),
          reason_code: 'NO_VALID_SLOT',
          reason_message: 'No remaining period satisfies the teacher, class, stream, resource, availability, and school-day constraints.',
        });
      }
    }
    if (gaps.length > 0) {
      warnings.push({ code: 'PARTIAL_GENERATION', message: `${gaps.length} requirement(s) could not be fully scheduled.` });
    }
    return { placements, gaps, warnings };
  }

  private score(snapshot: any, placement: PlacementLike & any, periods: any[]) {
    let score = 100;
    const reasons: string[] = [];
    const periodIds = new Set(periods.map((period) => String(period.id)));
    const availability = snapshot.availability.filter((item: any) =>
      String(item.teacher_id) === String(placement.teacher_id)
      && Number(item.day_of_week) === Number(placement.day_of_week)
      && periodIds.has(String(item.period_id)));
    if (availability.some((item: any) => item.state === 'prefer_free')) {
      score -= 35;
      reasons.push('Teacher prefers this period free');
    } else {
      score += 5;
      reasons.push('Teacher is available');
    }
    if ((placement.preferred_days ?? []).map(Number).includes(Number(placement.day_of_week))) {
      score += 12;
      reasons.push('Preferred teaching day');
    }
    if ((placement.preferred_start_period_ids ?? []).map(String).includes(String(placement.period_id))) {
      score += 12;
      reasons.push('Preferred start period');
    }
    const sameSubjectDay = snapshot.slots.filter((slot: any) =>
      String(slot.class_section_id) === String(placement.class_section_id)
      && String(slot.subject_id) === String(placement.subject_id)
      && Number(slot.day_of_week) === Number(placement.day_of_week)).length;
    score -= sameSubjectDay * 30;
    if (sameSubjectDay === 0) reasons.push('Spreads this subject across the week');
    if (placement.parallel_key && snapshot.slots.some((slot: any) => sameTeachingGroup(slot, placement)
      && slot.parallel_key === placement.parallel_key && Number(slot.day_of_week) === Number(placement.day_of_week)
      && this.time(slot.starts_at) === this.time(placement.starts_at))) score += 1000;
    const teacherDayLoad = snapshot.slots.filter((slot: any) =>
      String(slot.teacher_id) === String(placement.teacher_id)
      && Number(slot.day_of_week) === Number(placement.day_of_week)).length;
    score -= teacherDayLoad * 3;
    if (teacherDayLoad <= 2) reasons.push('Balances the teacher daily load');
    const classDayLoad = snapshot.slots.filter((slot: any) => sameTeachingGroup(slot, placement) && Number(slot.day_of_week) === Number(placement.day_of_week))
      .reduce((sum: number, slot: any) => sum + Number(slot.duration_periods || 1), 0);
    score -= classDayLoad * 2;
    const startHour = this.time(placement.starts_at);
    const sameTimeSubject = snapshot.slots.filter((slot: any) => sameTeachingGroup(slot, placement)
      && slot.subject_id === placement.subject_id && Math.abs(this.time(slot.starts_at) - startHour) < 60).length;
    score -= sameTimeSubject * 4;
    return { score, preferred: score >= 105, reasons };
  }

  private periodSequence(configuration: any, dayOfWeek: number, startPeriodId?: string | null, duration = 1): any[] {
    const day = (configuration.days ?? []).find((item: any) => Number(item.day_of_week) === Number(dayOfWeek));
    if (!day || !startPeriodId) return [];
    const periods = [...(day.periods ?? [])].sort((left: any, right: any) => Number(left.order_index) - Number(right.order_index));
    const startIndex = periods.findIndex((period: any) => String(period.id) === String(startPeriodId));
    if (startIndex < 0) return [];
    return periods.slice(startIndex, startIndex + Math.max(1, Number(duration)));
  }

  private blockApplies(block: any, placement: PlacementLike): boolean {
    const targets = Array.isArray(block.target_ids) ? block.target_ids.map(String) : [];
    switch (String(block.target_scope)) {
      case 'school': return true;
      case 'class': return targets.includes(String(placement.class_section_id));
      case 'stream': return Boolean(placement.stream_id) && targets.includes(String(placement.stream_id));
      case 'grade': return targets.includes(String(placement.class_section_id));
      default: return false;
    }
  }

  private overlaps(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): boolean {
    return leftStart < rightEnd && leftEnd > rightStart;
  }

  private time(value: unknown): number {
    const parts = String(value ?? '').slice(0, 5).split(':').map(Number);
    if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
      throw new BadRequestException('A timetable time value is invalid');
    }
    return parts[0] * 60 + parts[1];
  }
}
