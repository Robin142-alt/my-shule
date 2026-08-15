import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { EventPublisherService } from '../events/event-publisher.service';
import type { SupportedDomainEventName, TimetableLifecyclePayload } from '../events/events.types';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  AssignReliefDto,
  AutoFixTimetableDto,
  BulkSetTeacherAvailabilityDto,
  BulkUpsertRequirementsDto,
  CancelReliefDto,
  CancelTimetableSlotDto,
  ConfigureTimetableDto,
  CopyTimetableDto,
  CreateTimetableResourceDto,
  CreateTimetableSlotDto,
  FindValidSlotsDto,
  GenerateTimetableDto,
  LockTimetableSlotDto,
  MoveTimetableSlotDto,
  PlaceUnscheduledLessonDto,
  PortalTimetableQueryDto,
  PublishTimetableVersionDto,
  RegenerateTimetableDto,
  ReliefAffectedQueryDto,
  ReliefCandidatesQueryDto,
  TimetableExportQueryDto,
  TimetableHistoryQueryDto,
  TimetableViewQueryDto,
  UpdateTimetableResourceDto,
  UpdateTimetableSlotDto,
  ValidateTimetableDto,
} from './dto/timetable.dto';
import { TimetableWorkflowRepository, type TimetableScope } from './repositories/timetable-workflow.repository';
import { TimetableRepository } from './repositories/timetable.repository';
import { TimetableConstraintService } from './timetable-constraint.service';

type AcademicScope = { academic_year: string; term_name: string };

@Injectable()
export class TimetableService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly timetableRepository: TimetableRepository,
    private readonly workflowRepository: TimetableWorkflowRepository = undefined as never,
    private readonly constraintService: TimetableConstraintService = undefined as never,
    @Optional() private readonly eventPublisher?: EventPublisherService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async getReadiness(query: Record<string, string | undefined>) {
    const scope = this.normalizeAcademicQuery(query);
    return this.constraintService.readiness(this.requireTenantId(), scope.academic_year, scope.term_name);
  }

  async getConfiguration(query: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const scope = this.normalizeAcademicQuery(query);
    await this.workflowRepository.assertAcademicScope(tenantId, scope.academic_year, scope.term_name);
    const configuration = await this.workflowRepository.getConfiguration(
      tenantId,
      scope.academic_year,
      scope.term_name,
    );
    return configuration ? { ...configuration, teaching_days: configuration.days } : null;
  }

  async configure(dto: ConfigureTimetableDto) {
    const tenantId = this.requireTenantId();
    const scope = this.normalizeAcademicScope(dto);
    const days = dto.days ?? dto.teaching_days ?? [];
    if (days.length === 0) {
      throw new BadRequestException('Configure at least one school day');
    }
    const configuration = await this.workflowRepository.saveConfiguration({
      tenant_id: tenantId,
      ...scope,
      expected_row_version: dto.expected_row_version,
      days,
      common_blocks: dto.common_blocks ?? [],
      actor_user_id: this.getActorUserId(),
    });
    await this.publishWorkflowEvent(
      'timetable.configuration.updated',
      configuration.id,
      scope,
      'configuration_updated',
      { row_version: configuration.row_version },
    );
    return { ...configuration, teaching_days: configuration.days };
  }

  async getRequirements(query: Record<string, string | undefined>) {
    const scope = this.normalizeAcademicQuery(query);
    const items = await this.workflowRepository.listRequirements(
      this.requireTenantId(),
      scope.academic_year,
      scope.term_name,
    );
    return {
      items,
      metrics: {
        requirements: items.length,
        periods_per_week: items.reduce((total: number, item: any) => total + Number(item.periods_per_week ?? 0), 0),
      },
    };
  }

  async saveRequirements(dto: BulkUpsertRequirementsDto) {
    const tenantId = this.requireTenantId();
    const scope = this.normalizeAcademicScope(dto);
    const requirements = dto.requirements.map((requirement) => ({
      ...requirement,
      id: requirement.requirement_id ?? requirement.id,
      periods_per_week: requirement.periods_per_week ?? requirement.weekly_periods,
      duration_periods: requirement.duration_periods ?? requirement.consecutive_periods ?? 1,
      preferred_start_period_ids:
        requirement.preferred_start_period_ids ?? requirement.preferred_period_ids ?? [],
    }));
    if (requirements.some((requirement) => !Number(requirement.periods_per_week))) {
      throw new BadRequestException('Every subject requirement needs periods_per_week');
    }
    const items = await this.workflowRepository.saveRequirements({
      tenant_id: tenantId,
      ...scope,
      requirements,
      replace_existing: dto.replace_existing,
      actor_user_id: this.getActorUserId(),
    });
    await this.publishWorkflowEvent(
      'timetable.requirements.updated',
      `${scope.academic_year}:${scope.term_name}`,
      scope,
      'requirements_updated',
      { count: items.length },
    );
    return { items };
  }

  async getAvailability(query: Record<string, string | undefined>) {
    const scope = this.normalizeAcademicQuery(query);
    const items = await this.workflowRepository.listAvailability(
      this.requireTenantId(),
      scope.academic_year,
      scope.term_name,
      this.optionalText(query.teacher_id),
    );
    return { items };
  }

  async saveAvailability(dto: BulkSetTeacherAvailabilityDto) {
    const tenantId = this.requireTenantId();
    const scope = this.normalizeAcademicScope(dto);
    const sourceItems = dto.items ?? dto.availability ?? [];
    if (sourceItems.length === 0) throw new BadRequestException('Add at least one availability entry');
    const items = sourceItems.map((item) => ({
      ...item,
      id: item.availability_id ?? item.id,
      state: this.normalizeAvailabilityState(item.state),
    }));
    if (items.some((item) => !item.period_id)) {
      throw new BadRequestException('Every availability entry must reference a configured period');
    }
    const saved = await this.workflowRepository.saveAvailability({
      tenant_id: tenantId,
      ...scope,
      items,
      replace_existing: dto.replace_existing,
      actor_user_id: this.getActorUserId(),
    });
    await this.publishWorkflowEvent(
      'timetable.availability.updated',
      `${scope.academic_year}:${scope.term_name}`,
      scope,
      'availability_updated',
      { count: saved.length },
    );
    return { items: saved };
  }

  async listResources(query: Record<string, string | undefined> = {}) {
    const items = await this.workflowRepository.listResources(
      this.requireTenantId(),
      this.optionalText(query.status),
    );
    return { items };
  }

  async createResource(dto: CreateTimetableResourceDto) {
    const tenantId = this.requireTenantId();
    const resource = await this.workflowRepository.createResource({
      ...dto,
      tenant_id: tenantId,
      name: this.requiredQueryText(dto.name, 'Resource name'),
      is_exclusive: dto.is_exclusive ?? dto.exclusive ?? true,
      status: dto.status ?? (dto.active === false ? 'inactive' : 'active'),
      actor_user_id: this.getActorUserId(),
    });
    await this.publishWorkflowEvent(
      'timetable.resource.created',
      resource.id,
      {},
      'resource_created',
      { row_version: resource.row_version, resource_type: resource.resource_type },
    );
    return resource;
  }

  async updateResource(resourceId: string, dto: UpdateTimetableResourceDto) {
    const tenantId = this.requireTenantId();
    const resource = await this.workflowRepository.updateResource(
      tenantId,
      resourceId,
      {
        ...dto,
        is_exclusive: dto.is_exclusive ?? dto.exclusive,
        status: dto.status ?? (dto.active == null ? undefined : dto.active ? 'active' : 'inactive'),
      },
      this.getActorUserId(),
    );
    await this.publishWorkflowEvent(
      'timetable.resource.updated',
      resource.id,
      {},
      'resource_updated',
      { row_version: resource.row_version },
    );
    return resource;
  }

  generate(dto: GenerateTimetableDto) {
    return this.generateInternal(dto);
  }

  async regenerate(dto: RegenerateTimetableDto) {
    if (!dto.confirm_scope) {
      throw new BadRequestException('Confirm the selected regeneration scope before replacing generated lessons');
    }
    return this.generateInternal(dto);
  }

  async validate(dto: ValidateTimetableDto) {
    const tenantId = this.requireTenantId();
    const scope = this.normalizeAcademicScope(dto);
    const version = dto.version_id
      ? await this.workflowRepository.getVersion(tenantId, dto.version_id)
      : await this.timetableRepository.getPlannerVersion({ tenant_id: tenantId, ...scope });
    if (!version) throw new NotFoundException('No timetable version exists for the selected academic term');
    if (version.academic_year !== scope.academic_year || version.term_name !== scope.term_name) {
      throw new BadRequestException('The selected timetable version does not belong to this academic term');
    }
    const expectedVersion = dto.expected_version_row_version ?? dto.expected_row_version;
    if (expectedVersion != null
      && Number(version.row_version) !== Number(expectedVersion)) {
      throw new BadRequestException('The timetable changed since it was loaded; refresh before validating');
    }
    const snapshot = await this.constraintService.getSnapshot(
      tenantId,
      scope.academic_year,
      scope.term_name,
      version.id,
    );
    const unscheduledCount = await this.workflowRepository.countOpenUnscheduled(tenantId, version.id);
    const validation = dto.proposed_change
      ? {
          valid: this.constraintService.validatePlacement(
            snapshot,
            dto.proposed_change as any,
            dto.slot_id,
          ).length === 0,
          hard_conflicts: this.constraintService.validatePlacement(
            snapshot,
            dto.proposed_change as any,
            dto.slot_id,
          ),
          warnings: [],
        }
      : this.constraintService.validateVersion(snapshot, unscheduledCount);
    const impact = await this.buildImpactSummary(tenantId, version, snapshot);
    await this.publishWorkflowEvent(
      'timetable.validation.completed',
      version.id,
      scope,
      'validation_completed',
      {
        version_id: version.id,
        hard_conflicts: validation.hard_conflicts.length,
        warnings: validation.warnings.length,
      },
    );
    return { version, ...validation, impact };
  }

  async getView(query: TimetableViewQueryDto) {
    const tenantId = this.requireTenantId();
    const canManage = this.canManageTimetable();
    if (query.include_draft === true && !canManage) {
      throw new ForbiddenException('Draft timetable views require timetable management permission');
    }
    const scope = await this.resolveReadAcademicScope(tenantId, query);
    if (query.version_id) {
      const requestedVersion = await this.workflowRepository.getVersion(tenantId, query.version_id);
      if (!requestedVersion) throw new NotFoundException('The selected timetable version was not found for this school');
      if (requestedVersion.status !== 'published' && !canManage) {
        throw new ForbiddenException('Only the current published timetable is available to read-only roles');
      }
    }
    const access = await this.resolveViewAccess(tenantId, scope, query);
    return this.workflowRepository.listView({
      tenant_id: tenantId,
      ...scope,
      version_id: query.version_id,
      view: query.view ?? 'master',
      class_section_id: query.class_section_id,
      stream_id: query.stream_id,
      teacher_id: access.teacher_id ?? query.teacher_id,
      resource_id: query.resource_id,
      day_of_week: query.day_of_week,
      prefer_draft: canManage && query.include_draft === true,
      allowed_class_section_ids: access.allowed_class_section_ids,
      department_id: access.department_id,
    });
  }

  async findValidSlots(dto: FindValidSlotsDto, forceBest = false) {
    const tenantId = this.requireTenantId();
    const scope = this.normalizeAcademicScope(dto);
    const version = await this.resolveEditableVersion(tenantId, scope, dto.version_id);
    const canonicalVersion = await this.workflowRepository.getVersion(tenantId, version.id);
    if (!canonicalVersion || canonicalVersion.status !== 'draft') {
      throw new BadRequestException('Valid-slot search requires the current editable timetable draft');
    }
    if (dto.expected_row_version != null
      && !dto.slot_id && !dto.unscheduled_id && !dto.unscheduled_lesson_id
      && Number(canonicalVersion.row_version) !== Number(dto.expected_row_version)) {
      throw new ConflictException('The timetable draft changed since it was loaded; refresh valid slots');
    }
    const snapshot = await this.constraintService.getSnapshot(
      tenantId,
      scope.academic_year,
      scope.term_name,
      version.id,
    );
    const unresolvedId = dto.unscheduled_id ?? dto.unscheduled_lesson_id;
    const unresolved = unresolvedId
      ? await this.workflowRepository.getUnscheduled(tenantId, unresolvedId)
      : undefined;
    const existing = dto.slot_id
      ? await this.workflowRepository.getSlotForEdit(tenantId, dto.slot_id)
      : undefined;
    const requirementId = dto.requirement_id ?? unresolved?.requirement_id;
    const requirement = requirementId
      ? snapshot.requirements.find((item: any) => String(item.id) === String(requirementId))
      : undefined;
    if (dto.slot_id && !existing) throw new NotFoundException('Timetable lesson was not found for this school');
    if (dto.slot_id && dto.expected_row_version != null
      && Number(existing?.row_version) !== Number(dto.expected_row_version)) {
      throw new ConflictException('The timetable lesson changed since it was loaded; refresh valid slots');
    }
    if (unresolved && dto.expected_row_version != null
      && Number(unresolved.row_version) !== Number(dto.expected_row_version)) {
      throw new ConflictException('The unscheduled lesson changed since it was loaded; refresh valid slots');
    }
    if (requirementId && !requirement) {
      throw new NotFoundException('Timetable subject requirement was not found for this academic term');
    }
    const request = {
      requirement_id: requirementId ?? existing?.requirement_id ?? requirement?.id,
      class_section_id: dto.class_section_id ?? existing?.class_section_id ?? requirement?.class_section_id,
      stream_id: dto.stream_id ?? existing?.stream_id ?? requirement?.stream_id ?? null,
      subject_id: dto.subject_id ?? existing?.subject_id ?? requirement?.subject_id,
      teacher_id: dto.teacher_id ?? existing?.teacher_id ?? requirement?.teacher_id,
      resource_id: dto.resource_id ?? existing?.resource_id ?? requirement?.resource_id ?? null,
      parallel_key: dto.parallel_key ?? existing?.parallel_key ?? requirement?.parallel_key ?? null,
      duration_periods:
        dto.duration_periods ?? dto.consecutive_periods ?? existing?.duration_periods ?? requirement?.duration_periods ?? 1,
      preferred_days: requirement?.preferred_days ?? [],
      preferred_start_period_ids: requirement?.preferred_start_period_ids ?? [],
    };
    if (!request.class_section_id || !request.subject_id || !request.teacher_id) {
      throw new BadRequestException('Class, subject, and teacher are required to find valid timetable slots');
    }
    const candidates = this.constraintService.findValidSlots(snapshot, request, dto.slot_id);
    const limit = Math.max(1, Math.min(Number(dto.limit ?? 50), 250));
    return {
      version,
      items: forceBest ? (candidates.best ? [candidates.best] : []) : candidates.items.slice(0, limit),
      best: candidates.best,
    };
  }

  async moveSlot(slotId: string, dto: MoveTimetableSlotDto) {
    const tenantId = this.requireTenantId();
    const slot = await this.workflowRepository.getSlotForEdit(tenantId, slotId);
    if (!slot) throw new NotFoundException('Draft timetable slot was not found for this school');
    if (slot.version_status !== 'draft') throw new BadRequestException('Published timetable lessons are immutable');
    if (dto.teacher_id && dto.teacher_id !== slot.teacher_id) {
      throw new BadRequestException('Use the timetable lesson editor to change its teacher allocation');
    }
    const destinationResource = dto.destination_resource_id ?? dto.resource_id;
    if (destinationResource && destinationResource !== slot.resource_id) {
      throw new BadRequestException('Use the timetable lesson editor to change its resource allocation');
    }
    const day = dto.destination_day_of_week ?? dto.day_of_week ?? Number(slot.day_of_week);
    const periodId = dto.destination_period_id ?? dto.period_id;
    if (!periodId) throw new BadRequestException('Select a destination period');
    const snapshot = await this.constraintService.getSnapshot(
      tenantId,
      slot.academic_year,
      slot.term_name,
      slot.version_id,
    );
    const timing = this.resolveConfiguredTiming(
      snapshot.configuration,
      day,
      periodId,
      Number(slot.duration_periods ?? 1),
    );
    const placement = {
      ...slot,
      day_of_week: day,
      period_id: periodId,
      starts_at: dto.destination_starts_at ?? dto.starts_at ?? timing.starts_at,
      ends_at: dto.destination_ends_at ?? dto.ends_at ?? timing.ends_at,
    };
    const conflicts = this.constraintService.validatePlacement(snapshot, placement, slotId);
    this.throwDetailedConflicts(conflicts);
    const moved = await this.workflowRepository.updateSlotAtomic({
      tenant_id: tenantId,
      slot_id: slotId,
      expected_row_version: dto.expected_row_version,
      expected_version_row_version:
        dto.expected_version_row_version ?? Number(slot.version_row_version),
      requirement_id: slot.requirement_id,
      class_section_id: slot.class_section_id,
      stream_id: slot.stream_id,
      subject_id: slot.subject_id,
      teacher_id: slot.teacher_id,
      room_id: slot.room_id,
      resource_id: slot.resource_id,
      day_of_week: day,
      period_id: periodId,
      starts_at: placement.starts_at,
      ends_at: placement.ends_at,
      duration_periods: slot.duration_periods,
      actor_user_id: this.getActorUserId(),
    });
    await this.publishWorkflowEvent(
      'timetable.slot.updated',
      slotId,
      { academic_year: slot.academic_year, term_name: slot.term_name },
      'updated',
      { version_id: slot.version_id, move: { day_of_week: day, period_id: periodId } },
    );
    return moved;
  }

  setSlotLock(slotId: string, dto: LockTimetableSlotDto) {
    return this.workflowRepository.setSlotLock({
      tenant_id: this.requireTenantId(),
      slot_id: slotId,
      expected_row_version: dto.expected_row_version,
      locked: dto.locked,
      actor_user_id: this.getActorUserId(),
    });
  }

  async listUnscheduled(query: Record<string, string | undefined>) {
    const scope = this.normalizeAcademicQuery(query);
    const items = await this.workflowRepository.listUnscheduled(
      this.requireTenantId(),
      scope.academic_year,
      scope.term_name,
      this.optionalText(query.version_id),
    );
    return { items, metrics: { remaining_periods: items.reduce((sum: number, item: any) => sum + Number(item.remaining_periods ?? 0), 0) } };
  }

  async placeUnscheduled(unscheduledId: string, dto: PlaceUnscheduledLessonDto) {
    const tenantId = this.requireTenantId();
    const unresolved = await this.workflowRepository.getUnscheduled(tenantId, unscheduledId);
    if (!unresolved) throw new NotFoundException('Unscheduled lesson was not found for this school');
    const snapshot = await this.constraintService.getSnapshot(
      tenantId,
      unresolved.academic_year,
      unresolved.term_name,
      unresolved.version_id,
    );
    const duration = Math.min(Number(unresolved.duration_periods ?? 1), Number(unresolved.remaining_periods));
    const timing = this.resolveConfiguredTiming(snapshot.configuration, dto.day_of_week, dto.period_id, duration);
    const placement = {
      requirement_id: unresolved.requirement_id,
      class_section_id: unresolved.class_section_id,
      stream_id: unresolved.stream_id,
      subject_id: unresolved.subject_id,
      teacher_id: dto.teacher_id ?? unresolved.teacher_id,
      resource_id: dto.resource_id ?? unresolved.resource_id,
      parallel_key: unresolved.parallel_key,
      day_of_week: dto.day_of_week,
      period_id: dto.period_id,
      starts_at: timing.starts_at,
      ends_at: timing.ends_at,
      duration_periods: duration,
    };
    const conflicts = this.constraintService.validatePlacement(snapshot, placement);
    this.throwDetailedConflicts(conflicts);
    return this.workflowRepository.placeUnscheduled({
      tenant_id: tenantId,
      unresolved_id: unscheduledId,
      expected_row_version: dto.expected_row_version ?? unresolved.row_version,
      placement,
      actor_user_id: this.getActorUserId(),
    });
  }

  async copyVersion(dto: CopyTimetableDto) {
    const tenantId = this.requireTenantId();
    const academicYear = this.requiredQueryText(dto.target_academic_year ?? dto.academic_year, 'Target academic year');
    const termName = this.requiredQueryText(dto.target_term_name ?? dto.term_name, 'Target term');
    let sourceVersionId = this.optionalText(dto.source_version_id);
    if (!sourceVersionId && dto.source_academic_year && dto.source_term_name) {
      const history = await this.workflowRepository.listVersionHistory(
        tenantId,
        dto.source_academic_year,
        dto.source_term_name,
      );
      sourceVersionId = history.active_published_id
        ?? history.items.find((item: any) => item.status === 'archived')?.id;
    }
    if (!sourceVersionId) throw new BadRequestException('Select a published source timetable version to copy');
    const result = await this.workflowRepository.copyVersionAtomic({
      tenant_id: tenantId,
      source_version_id: sourceVersionId,
      academic_year: academicYear,
      term_name: termName,
      expected_version_row_version: dto.expected_version_row_version,
      actor_user_id: this.getActorUserId(),
    });
    await this.publishWorkflowEvent(
      'timetable.version.copied',
      result.version_id,
      { academic_year: academicYear, term_name: termName },
      'copied',
      { source_version_id: sourceVersionId, changed_lessons: result.slots_copied },
    );
    return result;
  }

  async autoFix(dto: AutoFixTimetableDto) {
    const tenantId = this.requireTenantId();
    const scope = this.normalizeAcademicScope(dto);
    const version = await this.resolveEditableVersion(tenantId, scope, dto.version_id);
    const canonicalVersion = await this.workflowRepository.getVersion(tenantId, version.id);
    if (!canonicalVersion || canonicalVersion.status !== 'draft') {
      throw new BadRequestException('Auto-fix requires the current editable timetable draft');
    }
    const snapshot = await this.constraintService.getSnapshot(tenantId, scope.academic_year, scope.term_name, version.id);
    const validation = this.constraintService.validateVersion(snapshot, await this.workflowRepository.countOpenUnscheduled(tenantId, version.id));
    const requested = new Set((dto.conflict_ids ?? []).map(String));
    const conflictSlots = new Set<string>();
    for (const conflict of validation.hard_conflicts) {
      if (requested.size > 0 && !requested.has(conflict.code) && !(conflict.slot_ids ?? []).some((id) => requested.has(id))) continue;
      for (const id of conflict.slot_ids ?? []) conflictSlots.add(id);
    }
    const moves: Array<{ slot_id: string; expected_row_version: number; day_of_week: number; period_id: string; starts_at: string; ends_at: string }> = [];
    for (const slotId of [...conflictSlots].sort()) {
      const slot = snapshot.slots.find((item: any) => String(item.id) === slotId);
      if (!slot || slot.locked) continue;
      const candidate = this.constraintService.findValidSlots(snapshot, slot, slotId).best;
      if (!candidate) continue;
      moves.push({
        slot_id: slotId,
        expected_row_version: Number(slot.row_version),
        day_of_week: candidate.day_of_week,
        period_id: candidate.period_id,
        starts_at: candidate.starts_at,
        ends_at: candidate.ends_at,
      });
      Object.assign(slot, candidate);
    }
    const updatedVersion = moves.length > 0
      ? await this.workflowRepository.applyMovesAtomic({
          tenant_id: tenantId,
          version_id: version.id,
          expected_version_row_version:
            dto.expected_version_row_version ?? dto.expected_row_version ?? Number(canonicalVersion.row_version),
          moves,
          actor_user_id: this.getActorUserId(),
        })
      : version;
    await this.publishWorkflowEvent(
      'timetable.version.auto_fixed',
      version.id,
      scope,
      'auto_fixed',
      { version_id: version.id, changed_lessons: moves.length },
    );
    return { version: updatedVersion, changed_lessons: moves.length, moves, unresolved_conflicts: Math.max(0, conflictSlots.size - moves.length) };
  }

  async getHistory(query: TimetableHistoryQueryDto) {
    const academicYear = this.requiredQueryText(query.academic_year, 'Academic year');
    const termName = this.requiredQueryText(query.term_name, 'Term');
    const result = await this.workflowRepository.listVersionHistory(this.requireTenantId(), academicYear, termName);
    const offset = Math.max(0, Number(query.offset ?? 0));
    const limit = Math.max(1, Math.min(Number(query.limit ?? 50), 200));
    return { ...result, items: result.items.slice(offset, offset + limit), total: result.items.length };
  }

  getReliefAffected(query: ReliefAffectedQueryDto) {
    const teacherId = this.requiredQueryText(query.absent_teacher_id ?? query.teacher_id, 'Absent teacher');
    return this.workflowRepository.getReliefAffected(this.requireTenantId(), teacherId, query.date);
  }

  getReliefCandidates(query: ReliefCandidatesQueryDto) {
    const slotId = this.requiredQueryText(query.timetable_slot_id ?? query.slot_id, 'Timetable lesson');
    return this.workflowRepository.getReliefCandidates(this.requireTenantId(), slotId, query.date);
  }

  async assignRelief(dto: AssignReliefDto) {
    const tenantId = this.requireTenantId();
    const slotId = this.requiredQueryText(dto.timetable_slot_id ?? dto.slot_id, 'Timetable lesson');
    const substituteTeacherId = this.requiredQueryText(
      dto.substitute_teacher_id ?? dto.relief_teacher_id,
      'Substitute teacher',
    );
    const slot = await this.workflowRepository.getSlotForEdit(tenantId, slotId);
    if (!slot) throw new NotFoundException('Published timetable lesson was not found for this school');
    const assignment = await this.workflowRepository.assignRelief({
      tenant_id: tenantId,
      slot_id: slotId,
      relief_date: dto.relief_date,
      absent_teacher_id: String(slot.teacher_id),
      substitute_teacher_id: substituteTeacherId,
      reason: this.optionalText(dto.reason ?? dto.notes),
      actor_user_id: this.getActorUserId(),
    });
    let notification: { status: 'not_requested' | 'sent' | 'failed'; id?: string; message?: string } = {
      status: dto.notify_teacher === false ? 'not_requested' : 'failed',
    };
    if (dto.notify_teacher !== false) {
      if (!this.notificationsService) {
        notification = { status: 'failed', message: 'Relief was assigned, but the notification service is unavailable.' };
      } else {
        try {
          const created = await this.notificationsService.createNotification({
            schoolId: tenantId,
            actorUserId: this.getActorUserId() ?? undefined,
            targetUserId: substituteTeacherId,
            module: 'timetable',
            eventType: 'TIMETABLE_RELIEF_ASSIGNED',
            entityType: 'timetable_relief_assignment',
            entityId: assignment.id,
            title: 'Relief lesson assigned',
            message: `You have been assigned a relief lesson on ${dto.relief_date} from ${slot.starts_at} to ${slot.ends_at}.`,
            actionUrl: '/school/teacher/my-timetable',
            actionLabel: 'View timetable',
            metadataJson: { slot_id: slotId, relief_date: dto.relief_date },
          });
          await this.workflowRepository.setReliefNotificationId(tenantId, assignment.id, created.id);
          notification = { status: 'sent', id: created.id };
        } catch (error) {
          notification = {
            status: 'failed',
            message: `Relief was assigned, but notification delivery could not be queued: ${this.errorMessage(error)}`,
          };
        }
      }
    }
    await this.publishWorkflowEvent(
      'timetable.relief.assigned',
      assignment.id,
      { academic_year: slot.academic_year, term_name: slot.term_name },
      'relief_assigned',
      {
        version_id: slot.version_id,
        timetable_slot_id: slotId,
        relief_teacher_id: substituteTeacherId,
        original_teacher_id: slot.teacher_id,
        relief_date: dto.relief_date,
        notification_status: notification.status,
      },
    );
    return { assignment, notification };
  }

  async cancelRelief(reliefId: string, dto: CancelReliefDto) {
    const reason = this.requiredQueryText(dto.cancellation_reason ?? dto.reason, 'Cancellation reason');
    const assignment = await this.workflowRepository.cancelRelief({
      tenant_id: this.requireTenantId(),
      relief_id: reliefId,
      reason,
      expected_row_version: dto.expected_row_version,
      actor_user_id: this.getActorUserId(),
    });
    await this.publishWorkflowEvent(
      'timetable.relief.cancelled',
      reliefId,
      {},
      'relief_cancelled',
      {
        version_id: assignment.version_id,
        timetable_slot_id: assignment.slot_id,
        relief_teacher_id: assignment.substitute_teacher_id,
        original_teacher_id: assignment.absent_teacher_id,
        relief_date: assignment.relief_date,
      },
    );
    return assignment;
  }

  async exportCsv(query: TimetableExportQueryDto) {
    if (query.format && query.format !== 'csv') {
      throw new BadRequestException('This endpoint generates CSV only; use a configured PDF document renderer for PDF output');
    }
    const view = await this.getView(query);
    if (!view.version) throw new NotFoundException('No published timetable is available for this view');
    const academic = {
      academic_year: String(view.version.academic_year),
      term_name: String(view.version.term_name),
    };
    const headers = [
      'Day', 'Start', 'End', 'Class', 'Stream', 'Subject', 'Teacher', 'Resource', 'Status',
    ];
    const lines = [headers, ...view.items.map((slot: any) => [
      slot.day_of_week,
      slot.starts_at,
      slot.ends_at,
      slot.class_name,
      slot.stream_name ?? '',
      slot.subject_name,
      slot.teacher_name,
      slot.resource_name ?? slot.room_id ?? '',
      slot.status,
    ])].map((row) => row.map((value) => this.csvCell(value)).join(','));
    const filename = `timetable-${this.filenamePart(academic.academic_year)}-${this.filenamePart(academic.term_name)}-${query.view ?? 'master'}.csv`;
    await this.publishWorkflowEvent(
      'timetable.export.generated',
      view.version?.id ?? `${query.academic_year}:${query.term_name}`,
      academic,
      'export_generated',
      { version_id: view.version?.id ?? null, export_format: 'csv', records: view.items.length },
    );
    return { filename, content_type: 'text/csv; charset=utf-8', content: `\uFEFF${lines.join('\r\n')}\r\n`, records: view.items.length };
  }

  async getPortal(query: PortalTimetableQueryDto) {
    const tenantId = this.requireTenantId();
    const userId = this.requireActorUserId();
    const role = this.requireActorRole();
    const clock = this.nairobiClock(query.date);
    const schedule = await this.workflowRepository.listPortalSchedule({
      tenant_id: tenantId,
      user_id: userId,
      role,
      requested_student_id: query.student_id ?? query.child_id,
      academic_year: this.optionalText(query.academic_year),
      term_name: this.optionalText(query.term_name),
      version_id: this.optionalText(query.version_id),
      date: clock.date,
    });
    if (query.class_section_id && schedule.scope.kind === 'class'
      && String(query.class_section_id) !== String(schedule.scope.class_section_id)) {
      throw new ForbiddenException('The requested class is not linked to this portal account');
    }
    const tomorrowSchedule = await this.workflowRepository.listPortalSchedule({
      tenant_id: tenantId,
      user_id: userId,
      role,
      requested_student_id: query.student_id ?? query.child_id,
      academic_year: this.optionalText(query.academic_year),
      term_name: this.optionalText(query.term_name),
      version_id: this.optionalText(query.version_id),
      date: clock.tomorrow_date,
    });
    const today = schedule.items.filter((slot: any) => Number(slot.day_of_week) === clock.today_day);
    const tomorrow = tomorrowSchedule.items.filter((slot: any) => Number(slot.day_of_week) === clock.tomorrow_day);
    const current = today.find((slot: any) => this.timeMinutes(slot.starts_at) <= clock.minutes && clock.minutes < this.timeMinutes(slot.ends_at)) ?? null;
    const next = today.find((slot: any) => this.timeMinutes(slot.starts_at) > clock.minutes) ?? null;
    return {
      ...schedule,
      reference_date: clock.date,
      today,
      tomorrow,
      current,
      next,
    };
  }

  async createSlot(dto: CreateTimetableSlotDto) {
    const tenantId = this.requireTenantId();
    const input = this.normalizeSlotInput(dto);
    const version = await this.timetableRepository.getOrCreateDraftVersion({
      tenant_id: tenantId,
      academic_year: input.academic_year,
      term_name: input.term_name,
    });
    const canonicalVersion = await this.workflowRepository.getVersion(tenantId, version.id);
    if (!canonicalVersion || canonicalVersion.status !== 'draft') {
      throw new BadRequestException('No editable timetable draft is available for this academic term');
    }
    const snapshot = await this.constraintService.getSnapshot(
      tenantId,
      input.academic_year,
      input.term_name,
      version.id,
    );
    const periodId = input.period_id ?? this.resolvePeriodIdByTiming(
      snapshot.configuration,
      input.day_of_week,
      input.starts_at,
      input.ends_at,
    );
    const placement = {
      ...input,
      period_id: periodId,
      duration_periods: input.duration_periods
        ?? this.resolveDurationByTiming(snapshot.configuration, input.day_of_week, periodId, input.ends_at),
    };
    this.throwDetailedConflicts(this.constraintService.validatePlacement(snapshot, placement as any));
    const slot = await this.workflowRepository.createSlotAtomic({
      tenant_id: tenantId,
      version_id: version.id,
      expected_version_row_version:
        dto.expected_version_row_version ?? Number(canonicalVersion.row_version),
      requirement_id: placement.requirement_id,
      class_section_id: placement.class_section_id,
      stream_id: placement.stream_id,
      subject_id: placement.subject_id,
      teacher_id: placement.teacher_id,
      room_id: placement.room_id,
      resource_id: placement.resource_id,
      period_id: periodId,
      parallel_key: placement.parallel_key,
      day_of_week: placement.day_of_week,
      starts_at: placement.starts_at,
      ends_at: placement.ends_at,
      duration_periods: placement.duration_periods,
      locked: placement.locked,
      notes: placement.notes,
      actor_user_id: this.getActorUserId(),
    });
    await this.publishLifecycleEvent('timetable.slot.created', slot?.id ?? 'unknown-slot', input, 'created');
    return slot;
  }

  async updateSlot(slotId: string, dto: UpdateTimetableSlotDto) {
    const tenantId = this.requireTenantId();
    const input = this.normalizeSlotInput(dto);
    const current = await this.workflowRepository.getSlotForEdit(tenantId, slotId);
    if (!current) throw new NotFoundException('Draft timetable slot was not found');
    if (current.version_status !== 'draft') throw new BadRequestException('Published timetables are locked. Create a revision before editing.');
    if (current.academic_year !== input.academic_year || current.term_name !== input.term_name) {
      throw new BadRequestException('The timetable lesson does not belong to the selected academic term');
    }
    const snapshot = await this.constraintService.getSnapshot(tenantId, input.academic_year, input.term_name, current.version_id);
    const periodId = input.period_id ?? this.resolvePeriodIdByTiming(
      snapshot.configuration,
      input.day_of_week,
      input.starts_at,
      input.ends_at,
    );
    const placement = {
      ...input,
      period_id: periodId,
      duration_periods: input.duration_periods
        ?? this.resolveDurationByTiming(snapshot.configuration, input.day_of_week, periodId, input.ends_at),
    };
    this.throwDetailedConflicts(this.constraintService.validatePlacement(snapshot, placement as any, slotId));
    const slot = await this.workflowRepository.updateSlotAtomic({
      tenant_id: tenantId,
      slot_id: slotId,
      expected_row_version: dto.expected_row_version ?? Number(current.row_version),
      expected_version_row_version:
        dto.expected_version_row_version ?? Number(current.version_row_version),
      requirement_id: placement.requirement_id,
      class_section_id: placement.class_section_id,
      stream_id: placement.stream_id,
      subject_id: placement.subject_id,
      teacher_id: placement.teacher_id,
      room_id: placement.room_id,
      resource_id: placement.resource_id,
      period_id: periodId,
      parallel_key: placement.parallel_key,
      day_of_week: placement.day_of_week,
      starts_at: placement.starts_at,
      ends_at: placement.ends_at,
      duration_periods: placement.duration_periods,
      actor_user_id: this.getActorUserId(),
    });
    await this.publishLifecycleEvent('timetable.slot.updated', slotId, input, 'updated');
    return slot;
  }

  async cancelSlot(slotId: string, dto: CancelTimetableSlotDto) {
    const slot = await this.workflowRepository.cancelSlotAtomic({
      tenant_id: this.requireTenantId(),
      slot_id: slotId,
      expected_row_version: dto.expected_row_version,
      reason: this.optionalText(dto.reason),
      actor_user_id: this.getActorUserId(),
    });
    await this.publishLifecycleEvent('timetable.slot.cancelled', slotId, slot as CreateTimetableSlotDto, 'cancelled');
    return slot;
  }

  async publishVersion(dto: PublishTimetableVersionDto) {
    const tenantId = this.requireTenantId();
    const input = this.normalizeVersionInput(dto);
    const draft = await this.timetableRepository.getPlannerVersion({ tenant_id: tenantId, academic_year: input.academic_year, term_name: input.term_name });
    if (!draft || draft.status !== 'draft') throw new BadRequestException('No draft timetable is available to publish');
    const canonicalDraft = await this.workflowRepository.getVersion(tenantId, draft.id);
    if (!canonicalDraft || canonicalDraft.status !== 'draft') {
      throw new BadRequestException('No current editable timetable draft is available to publish');
    }
    if (dto.version_id && dto.version_id !== draft.id) {
      throw new BadRequestException('The selected timetable version is not the current draft for this academic term');
    }
    const snapshot = await this.constraintService.getSnapshot(tenantId, input.academic_year, input.term_name, draft.id);
    if (!snapshot.configuration) throw new BadRequestException('Complete timetable configuration before publishing');
    const unscheduled = await this.workflowRepository.countOpenUnscheduled(tenantId, draft.id);
    const validation = this.constraintService.validateVersion(snapshot, unscheduled);
    const impact = await this.buildImpactSummary(tenantId, canonicalDraft, snapshot);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Resolve all hard timetable conflicts before publishing',
        validation,
      });
    }
    if (validation.warnings.length > 0 && dto.acknowledge_warnings !== true) {
      throw new BadRequestException({
        message: 'Review and acknowledge timetable warnings before publishing',
        requires_warning_acknowledgement: true,
        validation,
      });
    }
    const version = await this.workflowRepository.publishVersionAtomic({
      ...input,
      tenant_id: tenantId,
      expected_row_version:
        dto.expected_version_row_version ?? dto.expected_row_version ?? Number(canonicalDraft.row_version),
      configuration_snapshot: snapshot.configuration,
      validation_summary: {
        ...validation.summary,
        warnings_acknowledged: dto.acknowledge_warnings === true,
        impact,
      },
      actor_user_id: this.getActorUserId(),
    });
    if (!version) throw new BadRequestException('Timetable publication could not be completed');
    await this.publishLifecycleEvent('timetable.version.published', version.id, input, 'published');
    return { ...version, validation, impact };
  }

  async createRevision(dto: PublishTimetableVersionDto) {
    const tenantId = this.requireTenantId();
    const input = this.normalizeVersionInput(dto);
    const version = await this.workflowRepository.createRevisionAtomic({
      ...input,
      tenant_id: tenantId,
      expected_row_version: dto.expected_version_row_version ?? dto.expected_row_version,
      actor_user_id: this.getActorUserId(),
    });
    await this.publishLifecycleEvent('timetable.version.revision_created', version.id, input, 'revision_created');
    const snapshot = await this.constraintService.getSnapshot(
      tenantId,
      input.academic_year,
      input.term_name,
      version.id,
    );
    const impact = await this.buildImpactSummary(tenantId, version, snapshot);
    return { ...version, impact };
  }

  async getPlanner(query: Record<string, string | undefined> = {}) {
    const tenantId = this.requireTenantId();
    const scope = this.normalizeAcademicQuery(query);
    const version = await this.timetableRepository.getPlannerVersion({ tenant_id: tenantId, ...scope });
    const slots = version ? await this.timetableRepository.listVersionSlots(tenantId, version.id) : [];
    return {
      version,
      slots,
      metrics: {
        total_slots: slots.length,
        unique_classes: new Set(slots.map((slot: any) => slot.class_section_id)).size,
        unique_teachers: new Set(slots.map((slot: any) => slot.teacher_id)).size,
        draft: version?.status === 'draft',
        published: version?.status === 'published',
      },
    };
  }

  listPublishedSchedules(query: Record<string, string | undefined> = {}) {
    return this.timetableRepository.listPublishedSchedules({
      tenant_id: this.requireTenantId(),
      academic_year: this.optionalText(query.academic_year),
      term_name: this.optionalText(query.term_name),
      limit: this.parsePageLimit(query.limit),
      offset: this.parsePageOffset(query.offset),
    });
  }

  getMySchedule(query: Record<string, string | undefined> = {}) {
    return this.timetableRepository.listTeacherSchedule({
      tenant_id: this.requireTenantId(),
      teacher_id: this.requireActorUserId(),
      day_of_week: this.optionalText(query.day_of_week),
      academic_year: this.optionalText(query.academic_year),
      term_name: this.optionalText(query.term_name),
    });
  }

  async getTimetableDashboard(query: Record<string, string | undefined> = {}) {
    const academicYear = this.optionalText(query.academic_year);
    const termName = this.optionalText(query.term_name);
    if (academicYear || termName) {
      if (!academicYear || !termName) throw new BadRequestException('Academic year and term must be selected together');
      return this.getPlanner({ academic_year: academicYear, term_name: termName });
    }
    const versions = await this.timetableRepository.listActiveVersions(this.requireTenantId());
    const timetables = versions.map((version: any) => ({
      id: version.id,
      title: `${version.academic_year} ${version.term_name} master timetable`,
      name: `${version.academic_year} ${version.term_name} master timetable`,
      academic_year: version.academic_year,
      term_name: version.term_name,
      status: version.status,
      immutable: Boolean(version.immutable),
      slot_count: Number(version.slot_count ?? 0),
      conflict_count: Number(version.conflict_count ?? 0),
      owner_name: 'Deputy Principal / Timetable Manager',
    }));
    const conflicts = timetables.filter((version) => version.conflict_count > 0);
    return {
      metrics: {
        active_versions: timetables.length,
        draft_versions: timetables.filter((version) => version.status === 'draft').length,
        published_versions: timetables.filter((version) => version.status === 'published').length,
        conflict_count: conflicts.reduce((sum, version) => sum + version.conflict_count, 0),
      },
      timetables,
      published_candidates: timetables.filter((version) => version.status === 'draft'),
      conflicts,
      records: timetables,
      items: timetables,
    };
  }

  private async generateInternal(dto: GenerateTimetableDto | RegenerateTimetableDto) {
    const tenantId = this.requireTenantId();
    const academic = this.normalizeAcademicScope(dto);
    const readiness = await this.constraintService.readiness(tenantId, academic.academic_year, academic.term_name);
    if (readiness.blockers.length > 0) {
      throw new BadRequestException({ message: 'Timetable setup is not ready for generation', readiness });
    }
    const version = await this.resolveEditableVersion(tenantId, academic, dto.version_id, true);
    const canonicalVersion = await this.workflowRepository.getVersion(tenantId, version.id);
    if (!canonicalVersion || canonicalVersion.status !== 'draft') {
      throw new BadRequestException('No current editable timetable draft is available for generation');
    }
    const scope = this.normalizeGenerationScope(dto);
    const snapshot = await this.constraintService.getSnapshot(tenantId, academic.academic_year, academic.term_name, version.id);
    const retainedSlots = snapshot.slots.filter((slot: any) =>
      slot.locked
      || slot.source_kind !== 'generated'
      || !this.matchesGenerationScope(slot, dto, scope));
    const requirements = snapshot.requirements
      .filter((requirement: any) => this.matchesGenerationScope(requirement, dto, scope))
      .map((requirement: any) => {
        const alreadyScheduled = retainedSlots
          .filter((slot: any) => String(slot.requirement_id ?? '') === String(requirement.id))
          .reduce((sum: number, slot: any) => sum + Number(slot.duration_periods ?? 1), 0);
        return { ...requirement, periods_per_week: Math.max(0, Number(requirement.periods_per_week) - alreadyScheduled) };
      })
      .filter((requirement: any) => Number(requirement.periods_per_week) > 0);
    if (requirements.length === 0) throw new BadRequestException('No unscheduled subject requirements match the selected generation scope');
    const generated = this.constraintService.generate({ ...snapshot, requirements, slots: retainedSlots });
    if (generated.gaps.length > 0 && dto.allow_partial === false) {
      throw new BadRequestException({ message: 'The timetable could not be fully generated under current constraints', gaps: generated.gaps });
    }
    const saved = await this.workflowRepository.saveGenerationResult({
      tenant_id: tenantId,
      version_id: version.id,
      expected_row_version:
        dto.expected_version_row_version ?? dto.expected_row_version ?? Number(canonicalVersion.row_version),
      scope,
      placements: generated.placements,
      gaps: generated.gaps,
      required_lessons: requirements.reduce((sum: number, item: any) => sum + Number(item.periods_per_week ?? 0), 0),
      warnings: generated.warnings,
      actor_user_id: this.getActorUserId(),
    });
    const action = generated.gaps.length > 0 ? 'generation_partial' : 'generation_completed';
    const eventName = generated.gaps.length > 0 ? 'timetable.generation.partial' : 'timetable.generation.completed';
    await this.publishWorkflowEvent(eventName, saved.run.id, academic, action, {
      version_id: version.id,
      scheduled_lessons: generated.placements.reduce((sum, item) => sum + Number(item.duration_periods), 0),
      unscheduled_lessons: generated.gaps.reduce((sum, item) => sum + Number(item.remaining_periods), 0),
      scope,
    });
    return {
      status: generated.gaps.length > 0 ? 'PARTIAL' : 'COMPLETED',
      ...saved,
      placements: generated.placements,
      gaps: generated.gaps,
      warnings: generated.warnings,
    };
  }

  private async resolveViewAccess(tenantId: string, scope: AcademicScope, query: TimetableViewQueryDto) {
    const role = this.normalizedRole();
    const userId = this.requireActorUserId();
    const leadership = new Set(['principal', 'deputy_principal', 'dean_academics', 'dean_of_academics']);
    if (leadership.has(role)) return {};
    if (['class_teacher'].includes(role)) {
      const ids = await this.workflowRepository.resolveManagedClassSectionIds({
        tenant_id: tenantId,
        user_id: userId,
        role,
        academic_year: scope.academic_year,
      });
      if (ids.length === 0) throw new ForbiddenException('No active class-teacher timetable scope is assigned to this account');
      if (query.class_section_id && !ids.includes(query.class_section_id)) {
        throw new ForbiddenException('The selected class is outside this class-teacher assignment');
      }
      return { allowed_class_section_ids: ids };
    }
    if (['grade_master', 'form_master'].includes(role)) {
      const ids = await this.workflowRepository.resolveManagedClassSectionIds({
        tenant_id: tenantId,
        user_id: userId,
        role,
        academic_year: scope.academic_year,
      });
      if (ids.length === 0) throw new ForbiddenException('No active grade or form timetable scope is assigned to this account');
      if (query.class_section_id && !ids.includes(query.class_section_id)) {
        throw new ForbiddenException('The selected class is outside this grade-master assignment');
      }
      return { allowed_class_section_ids: ids };
    }
    if (['hod', 'head_of_department'].includes(role)) {
      const departmentId = await this.workflowRepository.resolveHodDepartmentId({ tenant_id: tenantId, user_id: userId });
      if (!departmentId) throw new ForbiddenException('No active department-head timetable scope is assigned to this account');
      return { department_id: departmentId };
    }
    if (query.teacher_id && query.teacher_id !== userId) {
      throw new ForbiddenException('Staff timetable views are restricted to the signed-in user');
    }
    return { teacher_id: userId };
  }

  private async buildImpactSummary(tenantId: string, version: any, currentSnapshot: any) {
    const sourceVersionId = this.optionalText(version?.source_version_id);
    const currentSlots = [...(currentSnapshot?.slots ?? [])];
    const dimensions = (slots: any[]) => {
      const values = (field: string) => [...new Set(
        slots.map((slot) => slot[field]).filter((value) => value != null && String(value) !== '').map(String),
      )].sort();
      const teacherIds = values('teacher_id');
      const classSectionIds = values('class_section_id');
      const streamIds = values('stream_id');
      const resourceIds = values('resource_id');
      const parallelKeys = values('parallel_key');
      return {
        teacher_ids: teacherIds,
        teacher_count: teacherIds.length,
        class_section_ids: classSectionIds,
        class_count: classSectionIds.length,
        stream_ids: streamIds,
        stream_count: streamIds.length,
        resource_ids: resourceIds,
        resource_count: resourceIds.length,
        parallel_keys: parallelKeys,
        parallel_group_count: parallelKeys.length,
      };
    };
    if (!sourceVersionId) {
      return {
        baseline: true,
        source_version_id: null,
        added_lessons: currentSlots.length,
        updated_lessons: 0,
        removed_lessons: 0,
        changed_lessons: currentSlots.length,
        ...dimensions(currentSlots),
      };
    }
    const sourceSnapshot = await this.constraintService.getSnapshot(
      tenantId,
      String(version.academic_year),
      String(version.term_name),
      sourceVersionId,
    );
    const sourceSlots = [...(sourceSnapshot?.slots ?? [])];
    const sourceById = new Map(sourceSlots.map((slot: any) => [String(slot.id), slot]));
    const comparedSourceIds = new Set<string>();
    const changedCurrent: any[] = [];
    let added = 0;
    let updated = 0;
    const signature = (slot: any) => JSON.stringify([
      slot.class_section_id, slot.stream_id ?? null, slot.subject_id, slot.teacher_id,
      slot.room_id ?? null, slot.resource_id ?? null, slot.period_id ?? null,
      slot.parallel_key ?? null, Number(slot.day_of_week), String(slot.starts_at).slice(0, 5),
      String(slot.ends_at).slice(0, 5), Number(slot.duration_periods ?? 1), Boolean(slot.locked),
    ]);
    for (const slot of currentSlots) {
      const sourceId = this.optionalText(slot.source_record_id);
      const source = sourceId ? sourceById.get(sourceId) : undefined;
      if (!source) {
        added += 1;
        changedCurrent.push(slot);
        continue;
      }
      comparedSourceIds.add(sourceId!);
      if (signature(source) !== signature(slot)) {
        updated += 1;
        changedCurrent.push(slot, source);
      }
    }
    const removedSlots = sourceSlots.filter((slot: any) => !comparedSourceIds.has(String(slot.id)));
    const affected = [...changedCurrent, ...removedSlots];
    return {
      baseline: false,
      source_version_id: sourceVersionId,
      added_lessons: added,
      updated_lessons: updated,
      removed_lessons: removedSlots.length,
      changed_lessons: added + updated + removedSlots.length,
      ...dimensions(affected),
    };
  }

  private async resolveEditableVersion(tenantId: string, scope: AcademicScope, versionId?: string, create = false) {
    const version = versionId
      ? await this.workflowRepository.getVersion(tenantId, versionId)
      : create
        ? await this.timetableRepository.getOrCreateDraftVersion({ tenant_id: tenantId, ...scope })
        : await this.timetableRepository.getPlannerVersion({ tenant_id: tenantId, ...scope });
    if (!version) throw new NotFoundException('No draft timetable exists for the selected academic term');
    if (version.academic_year !== scope.academic_year || version.term_name !== scope.term_name) {
      throw new BadRequestException('The selected timetable version does not belong to this academic term');
    }
    if (version.status !== 'draft') throw new BadRequestException('Published timetables are immutable; create a revision first');
    return version;
  }

  private normalizeGenerationScope(dto: GenerateTimetableDto | RegenerateTimetableDto): TimetableScope {
    const requested = dto.scope_type ?? dto.scope ?? 'whole_school';
    const type = requested === 'whole_school' || requested === 'unscheduled' ? 'school' : requested;
    const id = dto.scope_id
      ?? (type === 'class' ? dto.class_section_ids?.[0] : undefined)
      ?? (type === 'teacher' ? dto.teacher_ids?.[0] : undefined)
      ?? (type === 'requirement' ? dto.requirement_ids?.[0] : undefined);
    if (type !== 'school' && !id) throw new BadRequestException(`Select the ${type} to generate`);
    return { type: type as TimetableScope['type'], id };
  }

  private matchesGenerationScope(requirement: any, dto: GenerateTimetableDto | RegenerateTimetableDto, scope: TimetableScope) {
    if (dto.class_section_ids?.length && !dto.class_section_ids.includes(String(requirement.class_section_id))) return false;
    if (dto.teacher_ids?.length && !dto.teacher_ids.includes(String(requirement.teacher_id))) return false;
    if (dto.requirement_ids?.length && !dto.requirement_ids.includes(String(requirement.id))) return false;
    switch (scope.type) {
      case 'class': return String(requirement.class_section_id) === scope.id;
      case 'stream': return String(requirement.stream_id) === scope.id;
      case 'teacher': return String(requirement.teacher_id) === scope.id;
      case 'requirement': return String(requirement.id) === scope.id;
      default: return true;
    }
  }

  private normalizeSlotInput(dto: CreateTimetableSlotDto): CreateTimetableSlotDto {
    const startsAt = dto.starts_at.trim();
    const endsAt = dto.ends_at.trim();
    if (startsAt >= endsAt) throw new BadRequestException('Timetable slot end time must be after its start time');
    return {
      ...dto,
      academic_year: this.requiredQueryText(dto.academic_year, 'Academic year'),
      term_name: this.requiredQueryText(dto.term_name, 'Term'),
      class_section_id: this.requiredQueryText(dto.class_section_id, 'Class'),
      subject_id: this.requiredQueryText(dto.subject_id, 'Subject'),
      teacher_id: this.requiredQueryText(dto.teacher_id, 'Teacher'),
      room_id: this.optionalText(dto.room_id),
      resource_id: this.optionalText(dto.resource_id),
      period_id: this.optionalText(dto.period_id),
      day_of_week: dto.day_of_week,
      starts_at: startsAt,
      ends_at: endsAt,
      duration_periods: dto.duration_periods ?? dto.consecutive_periods,
    };
  }

  private normalizeVersionInput(dto: PublishTimetableVersionDto): PublishTimetableVersionDto {
    return {
      academic_year: this.requiredQueryText(dto.academic_year, 'Academic year'),
      term_name: this.requiredQueryText(dto.term_name, 'Term'),
      notes: this.optionalText(dto.notes),
      expected_version_row_version: dto.expected_version_row_version,
    };
  }

  private normalizeAcademicQuery(query: Record<string, string | undefined>): AcademicScope {
    return {
      academic_year: this.requiredQueryText(query.academic_year, 'Academic year'),
      term_name: this.requiredQueryText(query.term_name, 'Term'),
    };
  }

  private async resolveReadAcademicScope(
    tenantId: string,
    input: { academic_year?: string; term_name?: string; version_id?: string },
  ): Promise<AcademicScope> {
    const academicYear = this.optionalText(input.academic_year);
    const termName = this.optionalText(input.term_name);
    if (academicYear || termName) {
      if (!academicYear || !termName) {
        throw new BadRequestException('Academic year and term must be selected together');
      }
      return { academic_year: academicYear, term_name: termName };
    }
    if (input.version_id) {
      const version = await this.workflowRepository.getVersion(tenantId, input.version_id);
      if (!version) {
        throw new NotFoundException('The selected timetable version was not found for this school');
      }
      if (version.status !== 'published' && !this.canManageTimetable()) {
        throw new ForbiddenException('Only published timetable versions are available to read-only roles');
      }
      return { academic_year: version.academic_year, term_name: version.term_name };
    }
    const current = await this.workflowRepository.resolveCurrentPublishedAcademicScope(tenantId);
    if (!current) throw new NotFoundException('No published timetable is available for the current school term');
    return { academic_year: current.academic_year, term_name: current.term_name };
  }

  private normalizeAcademicScope(input: { academic_year?: string; term_name?: string }): AcademicScope {
    return {
      academic_year: this.requiredQueryText(input.academic_year, 'Academic year'),
      term_name: this.requiredQueryText(input.term_name, 'Term'),
    };
  }

  private normalizeAvailabilityState(value: string) {
    const state = value.trim().toLowerCase();
    return state === 'protected_admin' ? 'protected' : state;
  }

  private resolveConfiguredTiming(configuration: any, dayOfWeek: number, periodId: string, duration: number) {
    const day = configuration?.days?.find((item: any) => Number(item.day_of_week) === Number(dayOfWeek));
    const periods = [...(day?.periods ?? [])].sort((left: any, right: any) => Number(left.order_index) - Number(right.order_index));
    const start = periods.findIndex((period: any) => String(period.id) === String(periodId));
    const sequence = start < 0 ? [] : periods.slice(start, start + Math.max(1, duration));
    if (sequence.length !== Math.max(1, duration) || sequence.some((period: any) => !period.is_teaching)) {
      throw new BadRequestException('The selected period does not provide enough consecutive teaching time');
    }
    return { starts_at: String(sequence[0].starts_at), ends_at: String(sequence[sequence.length - 1].ends_at) };
  }

  private resolvePeriodIdByTiming(
    configuration: any,
    dayOfWeek: number,
    startsAt: string,
    endsAt: string,
  ): string {
    const day = configuration?.days?.find(
      (item: any) => Number(item.day_of_week) === Number(dayOfWeek),
    );
    const periods = [...(day?.periods ?? [])]
      .filter((period: any) => period.is_teaching)
      .sort((left: any, right: any) => Number(left.order_index) - Number(right.order_index));
    const period = periods.find((candidate: any) =>
      String(candidate.starts_at).slice(0, 5) === startsAt.slice(0, 5));
    if (!period) {
      throw new BadRequestException('The lesson start time must match a configured teaching period');
    }
    const startIndex = periods.indexOf(period);
    const matchingEnd = periods.slice(startIndex).some(
      (candidate: any) => String(candidate.ends_at).slice(0, 5) === endsAt.slice(0, 5),
    );
    if (!matchingEnd) {
      throw new BadRequestException('The lesson end time must match a configured consecutive teaching period');
    }
    return String(period.id);
  }

  private resolveDurationByTiming(
    configuration: any,
    dayOfWeek: number,
    periodId: string,
    endsAt: string,
  ): number {
    const day = configuration?.days?.find(
      (item: any) => Number(item.day_of_week) === Number(dayOfWeek),
    );
    const periods = [...(day?.periods ?? [])]
      .sort((left: any, right: any) => Number(left.order_index) - Number(right.order_index));
    const startIndex = periods.findIndex((period: any) => String(period.id) === String(periodId));
    const endIndex = periods.findIndex((period: any, index: number) =>
      index >= startIndex && String(period.ends_at).slice(0, 5) === endsAt.slice(0, 5));
    if (startIndex < 0 || endIndex < startIndex) {
      throw new BadRequestException('The lesson duration does not match configured school periods');
    }
    return endIndex - startIndex + 1;
  }

  private async validateSlotReferences(tenantId: string, input: CreateTimetableSlotDto) {
    const validation = await this.timetableRepository.validateSlotReferences(tenantId, input);
    const labels: Record<keyof typeof validation, string> = {
      academic_year: 'academic year', term: 'term', class_section: 'class', stream: 'stream', subject: 'subject', teacher: 'teacher', teacher_assignment: 'teacher assignment for this class and subject',
    };
    const missing = Object.entries(validation).filter(([, valid]) => !valid).map(([key]) => labels[key as keyof typeof validation]);
    if (missing.length > 0) throw new BadRequestException(`Invalid timetable setup: ${missing.join(', ')}`);
  }

  private throwForConflicts(conflicts: Array<{ type: string }>) {
    if (conflicts.length === 0) return;
    throw new BadRequestException(`Timetable ${[...new Set(conflicts.map((conflict) => conflict.type))].join(', ')} conflict detected`);
  }

  private throwDetailedConflicts(conflicts: Array<{ code: string; message: string }>) {
    if (conflicts.length === 0) return;
    throw new BadRequestException({ message: conflicts[0].message, conflicts });
  }

  private async auditSlot(action: string, slotId: string | null, input: CreateTimetableSlotDto) {
    await this.timetableRepository.appendAuditLog({
      tenant_id: this.requireTenantId(), slot_id: slotId, actor_user_id: this.getActorUserId(), action,
      metadata: {
        academic_year: input.academic_year, term_name: input.term_name, class_section_id: input.class_section_id,
        subject_id: input.subject_id, teacher_id: input.teacher_id, room_id: input.room_id ?? null,
        resource_id: input.resource_id ?? null, day_of_week: input.day_of_week,
        starts_at: input.starts_at, ends_at: input.ends_at,
      },
    });
  }

  private async publishLifecycleEvent(
    eventName: Extract<SupportedDomainEventName, `timetable.${string}`>,
    entityId: string,
    input: Pick<CreateTimetableSlotDto, 'academic_year' | 'term_name'>,
    action: TimetableLifecyclePayload['action'],
  ) {
    return this.publishWorkflowEvent(eventName, entityId, input, action);
  }

  private async publishWorkflowEvent(
    eventName: Extract<SupportedDomainEventName, `timetable.${string}`>,
    entityId: string,
    input: Partial<AcademicScope>,
    action: TimetableLifecyclePayload['action'],
    metadata: Record<string, any> = {},
  ) {
    if (!this.eventPublisher) return;
    const payload: TimetableLifecyclePayload = {
      tenant_id: this.requireTenantId(),
      entity_id: entityId,
      academic_year: input.academic_year,
      term_name: input.term_name,
      action,
      occurred_at: new Date().toISOString(),
      version_id: metadata.version_id,
      row_version: metadata.row_version,
      status: metadata.status,
      scheduled_lessons: metadata.scheduled_lessons,
      unscheduled_lessons: metadata.unscheduled_lessons,
      hard_conflicts: metadata.hard_conflicts,
      warnings: metadata.warnings,
      changed_lessons: metadata.changed_lessons,
      source_version_id: metadata.source_version_id,
      timetable_slot_id: metadata.timetable_slot_id,
      relief_teacher_id: metadata.relief_teacher_id,
      original_teacher_id: metadata.original_teacher_id,
      relief_date: metadata.relief_date,
      export_format: metadata.export_format,
      metadata,
    };
    await this.eventPublisher.publish({
      event_key: `${eventName}:${entityId}:${Date.now()}`,
      event_name: eventName,
      aggregate_type: eventName.includes('.slot.') ? 'timetable_slot' : eventName.includes('.relief.') ? 'timetable_relief' : 'timetable_version',
      aggregate_id: entityId,
      source_dashboard: this.normalizedRole() || 'timetable',
      payload,
    });
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant context is required for timetable operations');
    return tenantId;
  }

  private getActorUserId(): string | null {
    const userId = this.requestContext.getStore()?.user_id;
    return userId && userId !== 'anonymous' ? userId : null;
  }

  private requireActorUserId(): string {
    const userId = this.getActorUserId();
    if (!userId) throw new UnauthorizedException('Authenticated user context is required for this timetable view');
    return userId;
  }

  private requireActorRole(): string {
    const role = this.requestContext.getStore()?.role;
    if (!role) throw new UnauthorizedException('Authenticated role context is required for this timetable view');
    return role;
  }

  private normalizedRole(): string {
    return String(this.requestContext.getStore()?.role ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  }

  private canManageTimetable(): boolean {
    const permissions = this.requestContext.getStore()?.permissions ?? [];
    return permissions.includes('timetable:write')
      || permissions.includes('timetable:*')
      || permissions.includes('*:*');
  }

  private requiredQueryText(value: string | undefined, label: string): string {
    const normalized = value?.trim() ?? '';
    if (!normalized) throw new BadRequestException(`${label} is required`);
    return normalized;
  }

  private optionalText(value: string | undefined): string | undefined {
    const normalized = value?.trim() ?? '';
    return normalized || undefined;
  }

  private parsePageLimit(value: string | undefined): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 50;
    return Math.min(Math.floor(numeric), 100);
  }

  private parsePageOffset(value: string | undefined): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.floor(numeric);
  }

  private nairobiClock(date?: string) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
    const today = date ?? `${part('year')}-${part('month')}-${part('day')}`;
    const parsed = new Date(`${today}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Portal timetable date is invalid');
    const todayDay = parsed.getUTCDay() || 7;
    const tomorrowDate = new Date(parsed.getTime() + 86_400_000);
    const tomorrowDay = tomorrowDate.getUTCDay() || 7;
    return {
      date: today,
      today_day: todayDay,
      tomorrow_date: tomorrowDate.toISOString().slice(0, 10),
      tomorrow_day: tomorrowDay,
      minutes: date ? 0 : Number(part('hour')) * 60 + Number(part('minute')),
    };
  }

  private timeMinutes(value: unknown) {
    const [hour, minute] = String(value ?? '').slice(0, 5).split(':').map(Number);
    return Number(hour) * 60 + Number(minute);
  }

  private csvCell(value: unknown) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  private filenamePart(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'term';
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'unknown notification error';
  }
}
