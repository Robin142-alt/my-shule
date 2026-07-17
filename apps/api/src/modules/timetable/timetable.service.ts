import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { EventPublisherService } from '../events/event-publisher.service';
import type { SupportedDomainEventName, TimetableLifecyclePayload } from '../events/events.types';
import type {
  CreateTimetableSlotDto,
  PublishTimetableVersionDto,
  UpdateTimetableSlotDto,
} from './dto/timetable.dto';
import { TimetableRepository } from './repositories/timetable.repository';

@Injectable()
export class TimetableService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly timetableRepository: TimetableRepository,
    @Optional() private readonly eventPublisher?: EventPublisherService,
  ) {}

  async createSlot(dto: CreateTimetableSlotDto) {
    const tenantId = this.requireTenantId();
    const input = this.normalizeSlotInput(dto);
    await this.validateSlotReferences(tenantId, input);
    const version = await this.timetableRepository.getOrCreateDraftVersion({
      tenant_id: tenantId,
      academic_year: input.academic_year,
      term_name: input.term_name,
    });
    const conflicts = await this.timetableRepository.findSlotConflicts(tenantId, {
      ...input,
      version_id: version.id,
    });
    this.throwForConflicts(conflicts);

    const slot = await this.timetableRepository.createSlot({
      ...input,
      tenant_id: tenantId,
      version_id: version.id,
      created_by_user_id: this.getActorUserId(),
    });

    await this.auditSlot('timetable.slot.created', slot?.id ?? null, input);
    await this.publishLifecycleEvent('timetable.slot.created', slot?.id ?? 'unknown-slot', input, 'created');
    return slot;
  }

  async updateSlot(slotId: string, dto: UpdateTimetableSlotDto) {
    const tenantId = this.requireTenantId();
    const input = this.normalizeSlotInput(dto);
    await this.validateSlotReferences(tenantId, input);
    const version = await this.timetableRepository.getPlannerVersion({
      tenant_id: tenantId,
      academic_year: input.academic_year,
      term_name: input.term_name,
    });

    if (!version || version.status !== 'draft') {
      throw new BadRequestException('Published timetables are locked. Create a revision before editing.');
    }

    const conflicts = await this.timetableRepository.findSlotConflicts(tenantId, {
      ...input,
      version_id: version.id,
      exclude_slot_id: slotId,
    });
    this.throwForConflicts(conflicts);
    const slot = await this.timetableRepository.updateSlot({
      ...input,
      tenant_id: tenantId,
      slot_id: slotId,
    });

    if (!slot) {
      throw new NotFoundException('Draft timetable slot was not found');
    }

    await this.auditSlot('timetable.slot.updated', slotId, input);
    await this.publishLifecycleEvent('timetable.slot.updated', slotId, input, 'updated');
    return slot;
  }

  async cancelSlot(slotId: string) {
    const tenantId = this.requireTenantId();
    const slot = await this.timetableRepository.cancelSlot(tenantId, slotId);
    if (!slot) {
      throw new NotFoundException('Draft timetable slot was not found');
    }

    await this.timetableRepository.appendAuditLog({
      tenant_id: tenantId,
      slot_id: slotId,
      actor_user_id: this.getActorUserId(),
      action: 'timetable.slot.cancelled',
    });
    await this.publishLifecycleEvent(
      'timetable.slot.cancelled',
      slotId,
      slot as CreateTimetableSlotDto,
      'cancelled',
    );
    return slot;
  }

  async publishVersion(dto: PublishTimetableVersionDto) {
    const tenantId = this.requireTenantId();
    const input = this.normalizeVersionInput(dto);
    const draft = await this.timetableRepository.getPlannerVersion({
      tenant_id: tenantId,
      academic_year: input.academic_year,
      term_name: input.term_name,
    });

    if (!draft || draft.status !== 'draft') {
      throw new BadRequestException('No draft timetable is available to publish');
    }
    if (await this.timetableRepository.countVersionSlots(tenantId, draft.id) === 0) {
      throw new BadRequestException('Add at least one timetable slot before publishing');
    }

    const conflicts = await this.timetableRepository.findVersionConflicts(tenantId, input);
    if (conflicts.length > 0) {
      throw new BadRequestException('Timetable version has unresolved conflicts');
    }

    const version = await this.timetableRepository.publishVersion({
      ...input,
      tenant_id: tenantId,
      published_by_user_id: this.getActorUserId(),
    });
    if (!version) {
      throw new BadRequestException('Timetable publication could not be completed');
    }

    await this.timetableRepository.appendAuditLog({
      tenant_id: tenantId,
      version_id: version.id,
      actor_user_id: this.getActorUserId(),
      action: 'timetable.version.published',
      metadata: {
        academic_year: input.academic_year,
        term_name: input.term_name,
        immutable: true,
      },
    });
    await this.publishLifecycleEvent(
      'timetable.version.published',
      version.id,
      input,
      'published',
    );
    return version;
  }

  async createRevision(dto: PublishTimetableVersionDto) {
    const tenantId = this.requireTenantId();
    const input = this.normalizeVersionInput(dto);
    const version = await this.timetableRepository.createRevision({
      ...input,
      tenant_id: tenantId,
      created_by_user_id: this.getActorUserId(),
    });
    if (!version) {
      throw new BadRequestException('Publish the first timetable before creating a revision');
    }

    await this.timetableRepository.appendAuditLog({
      tenant_id: tenantId,
      version_id: version.id,
      actor_user_id: this.getActorUserId(),
      action: 'timetable.version.revision_created',
      metadata: {
        academic_year: input.academic_year,
        term_name: input.term_name,
      },
    });
    await this.publishLifecycleEvent(
      'timetable.version.revision_created',
      version.id,
      input,
      'revision_created',
    );
    return version;
  }

  async getPlanner(query: Record<string, string | undefined> = {}) {
    const tenantId = this.requireTenantId();
    const academicYear = this.requiredQueryText(query.academic_year, 'Academic year');
    const termName = this.requiredQueryText(query.term_name, 'Term');
    const version = await this.timetableRepository.getPlannerVersion({
      tenant_id: tenantId,
      academic_year: academicYear,
      term_name: termName,
    });
    const slots = version
      ? await this.timetableRepository.listVersionSlots(tenantId, version.id)
      : [];

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
      teacher_id: this.getActorUserId() ?? 'unknown-teacher',
      day_of_week: this.optionalText(query.day_of_week),
    });
  }

  async getTimetableDashboard(query: Record<string, string | undefined> = {}) {
    const academicYear = this.optionalText(query.academic_year);
    const termName = this.optionalText(query.term_name);
    if (academicYear || termName) {
      if (!academicYear || !termName) {
        throw new BadRequestException('Academic year and term must be selected together');
      }
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

  private normalizeSlotInput(dto: CreateTimetableSlotDto): CreateTimetableSlotDto {
    const startsAt = dto.starts_at.trim();
    const endsAt = dto.ends_at.trim();
    if (startsAt >= endsAt) {
      throw new BadRequestException('Timetable slot end time must be after its start time');
    }

    return {
      academic_year: this.requiredQueryText(dto.academic_year, 'Academic year'),
      term_name: this.requiredQueryText(dto.term_name, 'Term'),
      class_section_id: this.requiredQueryText(dto.class_section_id, 'Class'),
      subject_id: this.requiredQueryText(dto.subject_id, 'Subject'),
      teacher_id: this.requiredQueryText(dto.teacher_id, 'Teacher'),
      room_id: this.optionalText(dto.room_id),
      day_of_week: dto.day_of_week,
      starts_at: startsAt,
      ends_at: endsAt,
    };
  }

  private normalizeVersionInput(dto: PublishTimetableVersionDto): PublishTimetableVersionDto {
    return {
      academic_year: this.requiredQueryText(dto.academic_year, 'Academic year'),
      term_name: this.requiredQueryText(dto.term_name, 'Term'),
      notes: this.optionalText(dto.notes),
    };
  }

  private async validateSlotReferences(tenantId: string, input: CreateTimetableSlotDto) {
    const validation = await this.timetableRepository.validateSlotReferences(tenantId, input);
    const labels: Record<keyof typeof validation, string> = {
      academic_year: 'academic year',
      term: 'term',
      class_section: 'class',
      subject: 'subject',
      teacher: 'teacher',
      teacher_assignment: 'teacher assignment for this class and subject',
    };
    const missing = Object.entries(validation)
      .filter(([, valid]) => !valid)
      .map(([key]) => labels[key as keyof typeof validation]);
    if (missing.length > 0) {
      throw new BadRequestException(`Invalid timetable setup: ${missing.join(', ')}`);
    }
  }

  private throwForConflicts(conflicts: Array<{ type: string }>) {
    if (conflicts.length === 0) return;
    const conflictTypes = [...new Set(conflicts.map((conflict) => conflict.type))].join(', ');
    throw new BadRequestException(`Timetable ${conflictTypes} conflict detected`);
  }

  private async auditSlot(
    action: string,
    slotId: string | null,
    input: CreateTimetableSlotDto,
  ) {
    await this.timetableRepository.appendAuditLog({
      tenant_id: this.requireTenantId(),
      slot_id: slotId,
      actor_user_id: this.getActorUserId(),
      action,
      metadata: {
        academic_year: input.academic_year,
        term_name: input.term_name,
        class_section_id: input.class_section_id,
        subject_id: input.subject_id,
        teacher_id: input.teacher_id,
        room_id: input.room_id ?? null,
        day_of_week: input.day_of_week,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
      },
    });
  }

  private async publishLifecycleEvent(
    eventName: Extract<SupportedDomainEventName, `timetable.${string}`>,
    entityId: string,
    input: Pick<CreateTimetableSlotDto, 'academic_year' | 'term_name'>,
    action: TimetableLifecyclePayload['action'],
  ) {
    if (!this.eventPublisher) return;
    const tenantId = this.requireTenantId();
    await this.eventPublisher.publish({
      event_key: `${eventName}:${entityId}:${Date.now()}`,
      event_name: eventName,
      aggregate_type: eventName.startsWith('timetable.slot') ? 'timetable_slot' : 'timetable_version',
      aggregate_id: entityId,
      source_dashboard: 'deputy-principal',
      payload: {
        tenant_id: tenantId,
        entity_id: entityId,
        academic_year: input.academic_year,
        term_name: input.term_name,
        action,
        occurred_at: new Date().toISOString(),
        metadata: { ...input },
      },
    });
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for timetable operations');
    }
    return tenantId;
  }

  private getActorUserId(): string | null {
    const userId = this.requestContext.getStore()?.user_id;
    return userId && userId !== 'anonymous' ? userId : null;
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
}
