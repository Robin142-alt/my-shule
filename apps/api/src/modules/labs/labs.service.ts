import { randomUUID } from 'node:crypto';

import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { WorkflowRepository } from '../events/repositories/workflow.repository';
import {
  AddLaboratoryStockDto,
  ChemicalDisposalRequestDto,
  ConfirmPracticalIssueDto,
  CreateChemicalItemDto,
  CreateLabDepartmentDto,
  CreateLabDto,
  CreateLabEquipmentDto,
  CreateLabSessionDto,
  CreateLaboratoryItemDto,
  CreateLabStorageLocationDto,
  CreatePracticalRequestDto,
  GenerateLabRegisterDto,
  ImportLaboratoryItemsDto,
  IssueChemicalDto,
  IssueEquipmentDto,
  MarkLabAttendanceDto,
  PreparePracticalDto,
  ReceivePracticalReturnDto,
  ReconcileEquipmentDto,
  RecordBreakageLossDto,
  ReviewPracticalRequestDto,
  SaveLabSafetyCheckDto,
  SaveLabStocktakeDto,
  StartLabStocktakeDto,
} from './dto/labs.dto';
import { LabsRepository } from './repositories/labs.repository';

@Injectable()
export class LabsService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly labsRepository: LabsRepository,
    @Optional() private readonly eventPublisher?: EventPublisherService,
    @Optional() private readonly workflowRepository?: WorkflowRepository,
  ) {}

  async createDepartment(dto: CreateLabDepartmentDto) {
    const department = await this.labsRepository.createDepartment({
      tenant_id: this.requireTenantId(),
      name: this.requireText(dto.name, 'Department name'),
      type: this.requireDepartmentType(dto.type),
      hod_id: dto.hod_id?.trim() || null,
    });
    await this.audit('labs.department_created', 'lab_department', department?.id, dto);

    return department;
  }

  async createLab(dto: CreateLabDto) {
    const lab = await this.labsRepository.createLab({
      tenant_id: this.requireTenantId(),
      department_id: this.requireText(dto.department_id, 'Department'),
      name: this.requireText(dto.name, 'Lab name'),
      capacity: this.requirePositive(dto.capacity, 'Lab capacity'),
      location: dto.location?.trim() || null,
    });
    await this.audit('labs.lab_created', 'lab', lab?.id, dto);

    return lab;
  }

  async createLabSession(dto: CreateLabSessionDto) {
    const session = await this.labsRepository.createLabSession({
      tenant_id: this.requireTenantId(),
      lab_id: this.requireText(dto.lab_id, 'Lab'),
      class_section_id: this.requireText(dto.class_section_id, 'Class'),
      subject_id: dto.subject_id?.trim() || null,
      subject: this.requireText(dto.subject, 'Subject'),
      date: this.requireText(dto.date, 'Session date'),
      start_time: this.requireText(dto.start_time, 'Start time'),
      end_time: this.requireText(dto.end_time, 'End time'),
      teacher_id: this.requireText(dto.teacher_id, 'Teacher'),
      is_mandatory: dto.is_mandatory ?? true,
    });
    await this.audit('labs.session_created', 'lab_session', session?.id, dto);

    return session;
  }

  async markAttendance(sessionId: string, dto: MarkLabAttendanceDto) {
    if (!dto.attendance?.length) {
      throw new BadRequestException('At least one lab attendance row is required');
    }

    const rows = await this.labsRepository.markAttendance({
      tenant_id: this.requireTenantId(),
      session_id: this.requireText(sessionId, 'Lab session'),
      recorded_by: this.requireUserId(),
      attendance: dto.attendance.map((row) => ({
        student_id: this.requireText(row.student_id, 'Student'),
        status: this.requireAttendanceStatus(row.status),
      })),
    });
    await this.audit('labs.attendance_marked', 'lab_session', sessionId, {
      row_count: rows.length,
    });

    return rows;
  }

  async createEquipment(dto: CreateLabEquipmentDto) {
    const equipment = await this.labsRepository.createEquipment({
      tenant_id: this.requireTenantId(),
      department_id: dto.department_id?.trim() || null,
      lab_id: dto.lab_id?.trim() || null,
      name: this.requireText(dto.name, 'Equipment name'),
      asset_tag: dto.asset_tag?.trim() || null,
      quantity_total: this.requirePositive(dto.quantity_total, 'Total quantity'),
      condition_status: dto.condition_status?.trim() || 'serviceable',
      is_consumable: dto.is_consumable ?? false,
      unit: dto.unit?.trim() || 'Pieces',
      minimum_stock_level: this.requireNonNegative(dto.minimum_stock_level ?? 0, 'Minimum stock level'),
      storage_location: dto.storage_location?.trim() || null,
    });
    await this.audit('labs.equipment_created', 'lab_equipment', equipment?.id, dto);

    return equipment;
  }

  async createChemical(dto: CreateChemicalItemDto) {
    const chemical = await this.labsRepository.createChemical({
      tenant_id: this.requireTenantId(),
      lab_id: dto.lab_id?.trim() || null,
      name: this.requireText(dto.name, 'Chemical name'),
      chemical_formula: dto.chemical_formula?.trim() || null,
      hazard_class: dto.hazard_class?.trim() || null,
      batch_number: dto.batch_number?.trim() || null,
      quantity_total: this.requirePositive(dto.quantity_total, 'Chemical quantity'),
      unit: dto.unit?.trim() || 'Millilitres',
      manufacture_date: dto.manufacture_date ?? null,
      expiry_date: dto.expiry_date ? this.parseSchoolDate(dto.expiry_date, 'Expiry date') : null,
      minimum_stock_level: this.requireNonNegative(dto.minimum_stock_level ?? 0, 'Minimum stock level'),
      storage_location: dto.storage_location?.trim() || null,
      concentration: dto.concentration?.trim() || null,
    });
    await this.audit('labs.chemical_created', 'chemical_item', chemical?.id, dto);

    return chemical;
  }

  async issueEquipment(sessionId: string, dto: IssueEquipmentDto) {
    const usage = await this.labsRepository.issueEquipmentToSession({
      tenant_id: this.requireTenantId(),
      session_id: this.requireText(sessionId, 'Lab session'),
      equipment_id: this.requireText(dto.equipment_id, 'Equipment'),
      quantity_used: this.requirePositive(dto.quantity_used, 'Equipment quantity'),
      condition_after_use: dto.condition_after_use?.trim() || 'pending_return',
    });
    await this.audit('labs.equipment_issued', 'lab_session_equipment_usage', usage?.id, dto);

    return usage;
  }

  async reconcileEquipment(usageId: string, dto: ReconcileEquipmentDto) {
    const usage = await this.labsRepository.reconcileEquipmentUsage({
      tenant_id: this.requireTenantId(),
      usage_id: this.requireText(usageId, 'Equipment usage'),
      returned_quantity: this.requireNonNegative(dto.returned_quantity, 'Returned quantity'),
      condition_after_use: this.requireText(dto.condition_after_use, 'Condition after use'),
    });
    await this.audit('labs.equipment_reconciled', 'lab_session_equipment_usage', usage?.id, dto);

    return usage;
  }

  async issueChemical(sessionId: string, dto: IssueChemicalDto) {
    const tenantId = this.requireTenantId();
    const chemical = await this.labsRepository.findChemicalForIssue({
      tenant_id: tenantId,
      chemical_id: this.requireText(dto.chemical_id, 'Chemical'),
    });

    if (!chemical) {
      throw new NotFoundException('Chemical batch was not found');
    }

    this.assertChemicalCanBeIssued(
      chemical as { status: string; expiry_date: string; quantity_available: string | number },
      this.requirePositive(dto.quantity_used, 'Chemical quantity'),
    );

    const usage = await this.labsRepository.issueChemicalToSession({
      tenant_id: tenantId,
      session_id: this.requireText(sessionId, 'Lab session'),
      chemical_id: dto.chemical_id,
      quantity_used: dto.quantity_used,
      issued_by: this.requireUserId(),
    });
    await this.audit('labs.chemical_issued', 'lab_session_chemical_usage', usage?.id, dto);

    return usage;
  }

  async requestChemicalDisposal(chemicalId: string, dto: ChemicalDisposalRequestDto) {
    const request = await this.labsRepository.requestChemicalDisposal({
      tenant_id: this.requireTenantId(),
      chemical_id: this.requireText(chemicalId, 'Chemical'),
      requested_by: this.requireUserId(),
      reason: this.requireText(dto.reason, 'Disposal reason'),
    });
    await this.audit('labs.chemical_disposal_requested', 'chemical_disposal_request', request?.id, dto);

    return request;
  }

  async approveChemicalDisposal(requestId: string) {
    const request = await this.labsRepository.approveChemicalDisposal({
      tenant_id: this.requireTenantId(),
      request_id: this.requireText(requestId, 'Disposal request'),
      approved_by: this.requireUserId(),
    });
    await this.audit('labs.chemical_disposal_approved', 'chemical_disposal_request', request?.id, {});

    return request;
  }

  async completeLabSession(sessionId: string) {
    const tenantId = this.requireTenantId();
    const session = await this.labsRepository.getLabSessionForCompletion({
      tenant_id: tenantId,
      session_id: this.requireText(sessionId, 'Lab session'),
    });

    if (!session) {
      throw new NotFoundException('Lab session was not found');
    }

    if (session.is_mandatory) {
      await this.labsRepository.markMissingMandatoryAttendanceAbsent({
        tenant_id: tenantId,
        session_id: sessionId,
        recorded_by: this.requireUserId(),
      });
    }

    const completed = await this.labsRepository.completeLabSession({
      tenant_id: tenantId,
      session_id: sessionId,
    });

    if (session.is_mandatory) {
      await this.labsRepository.recordMandatoryLabAttendanceEffects({
        tenant_id: tenantId,
        session_id: sessionId,
        actor_user_id: this.requireUserId(),
      });
    }

    await this.audit('labs.session_completed', 'lab_session', sessionId, {});

    return completed;
  }

  private assertChemicalCanBeIssued(
    chemical: { status: string; expiry_date: string; quantity_available: string | number },
    requestedQuantity: number,
  ) {
    if (
      chemical.status === 'expired'
      || (chemical.expiry_date && new Date(chemical.expiry_date) < new Date())
    ) {
      throw new BadRequestException('Expired chemicals cannot be issued');
    }

    if (chemical.status === 'quarantined' || chemical.status === 'disposed') {
      throw new BadRequestException('This chemical batch is not available for use');
    }

    if (Number(chemical.quantity_available) < requestedQuantity) {
      throw new BadRequestException('Requested chemical quantity exceeds available batch quantity');
    }
  }

  private async audit(
    action: string,
    entityType: string,
    entityId: string | null | undefined,
    metadata: unknown,
  ) {
    await this.labsRepository.appendAuditLog({
      tenant_id: this.requireTenantId(),
      entity_type: entityType,
      entity_id: entityId ?? null,
      action,
      actor_user_id: this.currentUserId(),
      metadata: this.toMetadata(metadata),
    });
  }

  private toMetadata(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  async getDashboard() {
    const tenantId = this.requireTenantId();
    return this.labsRepository.getDashboard(tenantId);
  }

  async getInventory() {
    const tenantId = this.requireTenantId();
    return this.labsRepository.listLaboratoryInventory(tenantId);
  }

  async getRequests() {
    const tenantId = this.requireTenantId();
    const actorRole = this.currentRole();
    const requests = await this.labsRepository.getPracticalRequests(tenantId, actorRole);
    if (!this.isAssessmentPreparationRole(actorRole)) {
      const actorUserId = this.requireUserId();
      return requests.filter((request: any) => request.teacher_id === actorUserId);
    }
    return requests;
  }

  async getIssues() {
    const tenantId = this.requireTenantId();
    const actorRole = this.currentRole();
    const issues = await this.labsRepository.listPracticalIssues(tenantId, actorRole);
    if (!this.isAssessmentPreparationRole(actorRole)) {
      const actorUserId = this.requireUserId();
      return issues.filter((issue: any) => issue.teacher_id === actorUserId);
    }
    return issues;
  }

  async getHome() {
    if (['TEACHER', 'CLASS_TEACHER'].includes(this.currentRole())) {
      throw new ForbiddenException('The Laboratory Technician home screen is not available to teachers');
    }
    return this.labsRepository.getLaboratoryHome(this.requireTenantId(), this.currentRole());
  }

  async createLaboratoryItem(dto: CreateLaboratoryItemDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const itemName = this.requireText(dto.item_name, 'Item name');
    const category = this.requireText(dto.category, 'Category');
    const storageLocation = this.requireText(dto.storage_location, 'Storage location');
    const unit = dto.unit === 'Custom'
      ? this.requireText(dto.custom_unit, 'Custom unit')
      : this.requireText(dto.unit, 'Unit');
    const quantity = this.requireNonNegative(dto.quantity, 'Quantity');
    const minimumStockLevel = this.requireNonNegative(dto.minimum_stock_level, 'Minimum stock level');
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const replay = dto.submission_id?.trim()
      ? await this.labsRepository.findLaboratoryItemBySubmission(tenantId, submissionId)
      : null;
    if (replay) {
      await this.audit('laboratory.item.created', 'laboratory_item', replay.id, {
        item_type: dto.item_type,
        tracking_method: replay.tracking_method ?? dto.tracking_method ?? this.recommendTrackingMethod(itemName, dto.item_type),
        quantity,
        unit,
        storage_location: storageLocation,
        submission_id: submissionId,
        idempotent_replay: true,
      });
      await this.publishOperation({
        eventType: 'laboratory.item.created',
        entityType: 'laboratory_item',
        entityId: replay.id,
        idempotencyKey: submissionId,
        title: 'Laboratory item added',
        body: `${itemName} was added with ${quantity} ${unit} available.`,
        severity: 'success',
        payload: { item_type: dto.item_type, quantity, unit, storage_location: storageLocation, idempotent_replay: true },
      });
      return {
        duplicate: false,
        item: { ...replay, idempotent_replay: true },
        message: `${replay.item_name} was already added. The confirmed available quantity is ${replay.quantity_available} ${replay.unit}.`,
      };
    }
    const normalizedName = this.normalizeLaboratoryItemName(itemName);
    const duplicates = await this.labsRepository.findPotentialLaboratoryDuplicates(
      tenantId,
      normalizedName,
      storageLocation,
    );
    const duplicate = duplicates[0] as any;

    if (duplicate && (dto.duplicate_action ?? 'check') === 'check') {
      return {
        duplicate: true,
        existing_item: duplicate,
        message: `${duplicate.item_name} already exists in ${duplicate.storage_location || 'this laboratory'}.`,
        actions: ['add_stock', 'view_existing', 'create_separate', 'cancel'],
        submission_id: submissionId,
      };
    }

    if (duplicate && dto.duplicate_action === 'add_stock') {
      if (quantity <= 0) {
        throw new BadRequestException('Quantity added must be greater than zero');
      }
      const updated = await this.labsRepository.addLaboratoryStock({
        tenant_id: tenantId,
        item_id: duplicate.id,
        item_source: duplicate.item_source,
        quantity_added: quantity,
        notes: dto.notes?.trim() || `Added while entering ${itemName}`,
        submission_id: `${submissionId}:existing-stock`,
        recorded_by: actorUserId,
      });
      await this.audit('laboratory.stock.added', 'laboratory_item', duplicate.id, {
        quantity_added: quantity,
        unit: duplicate.unit,
        submission_id: submissionId,
      });
      await this.publishOperation({
        eventType: 'laboratory.stock.added',
        entityType: 'laboratory_item',
        entityId: duplicate.id,
        idempotencyKey: `${submissionId}:existing-stock`,
        title: 'Laboratory stock added',
        body: `${quantity} ${duplicate.unit} of ${duplicate.item_name} added.`,
        severity: 'success',
        payload: { quantity_added: quantity, quantity_available: updated?.quantity_available },
      });
      return {
        duplicate: false,
        added_to_existing: true,
        item: updated,
        message: `${quantity} ${duplicate.unit} of ${duplicate.item_name} added successfully. The new available quantity is ${updated?.quantity_available} ${duplicate.unit}.`,
      };
    }

    const itemSource = dto.item_type === 'chemical' ? 'chemical' : 'equipment';
    const trackingMethod = dto.tracking_method ?? this.recommendTrackingMethod(itemName, dto.item_type);
    const item = await this.labsRepository.createLaboratoryInventoryItem({
      tenant_id: tenantId,
      item_source: itemSource,
      item_type: dto.item_type,
      name: itemName,
      category,
      quantity_total: quantity,
      unit,
      minimum_stock_level: minimumStockLevel,
      storage_location_id: dto.storage_location_id?.trim() || null,
      storage_location: storageLocation,
      tracking_method: trackingMethod,
      condition_status: dto.condition?.trim() || 'serviceable',
      is_consumable: dto.item_type === 'consumable',
      asset_tag: trackingMethod === 'individual' ? dto.serial_number?.trim() || null : null,
      serial_number: dto.serial_number?.trim() || null,
      model: dto.model?.trim() || null,
      notes: dto.notes?.trim() || null,
      hazard_class: dto.safety_classification?.trim() || null,
      safety_classification: dto.safety_classification?.trim() || null,
      concentration: dto.concentration?.trim() || null,
      expiry_date: dto.expiry_date ? this.parseSchoolDate(dto.expiry_date, 'Expiry date') : null,
      submission_id: submissionId,
      recorded_by: actorUserId,
    });
    await this.audit('laboratory.item.created', 'laboratory_item', item?.id, {
      item_type: dto.item_type,
      tracking_method: trackingMethod,
      quantity,
      unit,
      storage_location: storageLocation,
      submission_id: submissionId,
    });
    await this.publishOperation({
      eventType: 'laboratory.item.created',
      entityType: 'laboratory_item',
      entityId: item?.id,
      idempotencyKey: submissionId,
      title: 'Laboratory item added',
      body: `${itemName} was added with ${quantity} ${unit} available.`,
      severity: 'success',
      payload: { item_type: dto.item_type, quantity, unit, storage_location: storageLocation },
    });
    return {
      duplicate: false,
      item,
      message: `${quantity} ${unit} of ${itemName} added successfully and stored at ${storageLocation}.`,
    };
  }

  async importLaboratoryItems(dto: ImportLaboratoryItemsDto) {
    const batchSubmissionId = this.requireText(dto.submission_id, 'Import submission');
    const results: Array<{
      row: number;
      status: 'imported' | 'duplicate' | 'failed';
      message: string;
      item?: unknown;
    }> = [];

    for (const [index, sourceItem] of dto.items.entries()) {
      const sourceRow = sourceItem.source_row ?? index + 2;
      try {
        const result = await this.createLaboratoryItem({
          ...sourceItem,
          submission_id: `${batchSubmissionId}:row:${sourceRow}`,
          duplicate_action: 'check',
        });
        if (result.duplicate) {
          results.push({
            row: sourceRow,
            status: 'duplicate',
            message: result.message,
            item: result.existing_item,
          });
        } else {
          results.push({
            row: sourceRow,
            status: 'imported',
            message: result.message,
            item: result.item,
          });
        }
      } catch (error) {
        results.push({
          row: sourceRow,
          status: 'failed',
          message: error instanceof Error ? error.message : 'This row could not be added to the laboratory stock book.',
        });
      }
    }

    const importedCount = results.filter((result) => result.status === 'imported').length;
    const duplicateCount = results.filter((result) => result.status === 'duplicate').length;
    const failedCount = results.filter((result) => result.status === 'failed').length;
    await this.audit('laboratory.stock_list.imported', 'laboratory_import', null, {
      submission_id: batchSubmissionId,
      row_count: dto.items.length,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      failed_count: failedCount,
    });

    return {
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      failed_count: failedCount,
      results,
      message: `Stock list checked. ${importedCount} ${importedCount === 1 ? 'item was' : 'items were'} added, ${duplicateCount} possible ${duplicateCount === 1 ? 'duplicate needs' : 'duplicates need'} review, and ${failedCount} ${failedCount === 1 ? 'row failed' : 'rows failed'}.`,
    };
  }

  async addLaboratoryStock(itemSource: string, itemId: string, dto: AddLaboratoryStockDto) {
    const source = this.requireItemSource(itemSource);
    const tenantId = this.requireTenantId();
    const quantity = this.requirePositive(dto.quantity_added, 'Quantity added');
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const item = await this.labsRepository.addLaboratoryStock({
      tenant_id: tenantId,
      item_source: source,
      item_id: this.requireText(itemId, 'Laboratory item'),
      quantity_added: quantity,
      date_added: dto.date_added ? this.parseSchoolDate(dto.date_added, 'Date added') : null,
      notes: dto.notes?.trim() || null,
      submission_id: submissionId,
      recorded_by: this.requireUserId(),
    });
    await this.audit('laboratory.stock.added', 'laboratory_item', itemId, {
      quantity_added: quantity,
      submission_id: submissionId,
    });
    await this.publishOperation({
      eventType: 'laboratory.stock.added',
      entityType: 'laboratory_item',
      entityId: itemId,
      idempotencyKey: submissionId,
      title: 'Laboratory stock added',
      body: `${quantity} ${item?.unit} of ${item?.item_name} added.`,
      severity: 'success',
      payload: { quantity_added: quantity, quantity_available: item?.quantity_available },
    });
    return {
      item,
      message: `${quantity} ${item?.unit} of ${item?.item_name} added successfully. The new available quantity is ${item?.quantity_available} ${item?.unit}.`,
    };
  }

  async createStorageLocation(dto: CreateLabStorageLocationDto) {
    const parts = [
      this.requireText(dto.laboratory_or_store, 'Laboratory or store'),
      dto.room_or_section?.trim(),
      dto.cupboard_or_cabinet?.trim(),
      dto.shelf?.trim(),
    ].filter((value): value is string => Boolean(value));
    const location = await this.labsRepository.createStorageLocation({
      tenant_id: this.requireTenantId(),
      laboratory_or_store: parts[0],
      room_or_section: dto.room_or_section?.trim() || null,
      cupboard_or_cabinet: dto.cupboard_or_cabinet?.trim() || null,
      shelf: dto.shelf?.trim() || null,
      full_path: parts.join(' → '),
      created_by: this.requireUserId(),
    });
    await this.audit('laboratory.storage_location.created', 'lab_storage_location', location?.id, {
      full_path: location?.full_path,
    });
    return { location, message: `${location?.full_path} added as a storage location.` };
  }

  async listStorageLocations() {
    return this.labsRepository.listStorageLocations(this.requireTenantId());
  }

  async createPracticalRequest(dto: CreatePracticalRequestDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const actorRole = this.currentRole();
    const submissionId = dto.submission_id?.trim() || randomUUID();
    if (!dto.items?.length) {
      throw new BadRequestException('Add at least one item to the practical request');
    }
    if (dto.is_assessment && !this.isAssessmentPreparationRole(actorRole)) {
      throw new ForbiddenException('Secure assessment preparation is limited to authorized laboratory and examination staff');
    }
    const isTeacherRequest = this.isTeachingRole(actorRole);
    const teacherId = isTeacherRequest ? actorUserId : dto.teacher_id?.trim() || null;
    const linkedTeacherName = teacherId
      ? await this.labsRepository.getSchoolUserDisplayName(tenantId, teacherId)
      : null;
    if (teacherId && !linkedTeacherName) {
      throw new BadRequestException('Selected teacher is not an active member of this school');
    }
    const request = await this.labsRepository.createPracticalRequest({
      tenant_id: tenantId,
      subject: this.requireText(dto.subject, 'Subject'),
      class_name: this.requireText(dto.class_name, 'Class and stream'),
      practical_date: this.parseSchoolDate(dto.practical_date, 'Practical date'),
      lesson_time: this.requireText(dto.lesson_time, 'Lesson time'),
      practical_title: this.requireText(dto.practical_title, 'Practical title'),
      teacher_id: teacherId,
      teacher_name: linkedTeacherName || this.requireText(dto.teacher_name, 'Teacher'),
      learner_groups: dto.learner_groups ?? null,
      teacher_notes: dto.teacher_notes?.trim() || null,
      is_assessment: dto.is_assessment ?? false,
      confidential_notes: dto.is_assessment ? dto.confidential_notes?.trim() || null : null,
      authorized_roles: this.normalizeAuthorizedRoles(dto.authorized_roles),
      submission_id: submissionId,
      created_by: actorUserId,
      actor_role: actorRole,
      items: dto.items.map((item) => ({
        item_id: item.item_id?.trim() || null,
        item_source: item.item_source ?? null,
        item_name: this.requireText(item.item_name, 'Requested item name'),
        requested_quantity: this.requirePositive(item.requested_quantity, 'Requested quantity'),
        unit: this.requireText(item.unit, 'Requested item unit'),
        is_returnable: item.is_returnable ?? item.item_source !== 'chemical',
        notes: item.notes?.trim() || null,
      })),
    });
    await this.audit('laboratory.practical.requested', 'lab_practical_request', request?.id, {
      subject: dto.subject,
      class_name: dto.class_name,
      practical_date: dto.practical_date,
      item_count: dto.items.length,
      is_assessment: dto.is_assessment ?? false,
      submission_id: submissionId,
    });
    if (this.eventPublisher && request?.id) {
      await this.eventPublisher.publish({
        event_key: `lab.request.submitted:${request.id}`,
        event_name: 'lab.request.submitted',
        aggregate_type: 'lab_practical_request',
        aggregate_id: request.id,
        source_dashboard: this.currentRole(),
        payload: {
          tenant_id: tenantId,
          request_id: request.id,
          requested_by_user_id: actorUserId,
          requested_at: new Date().toISOString(),
          equipment_id: dto.items.find((item) => item.item_id)?.item_id ?? request.id,
          date_needed: this.parseSchoolDate(dto.practical_date, 'Practical date'),
          status: 'requested',
        },
      });
    }
    return {
      request,
      message: `${dto.subject} practical request for ${dto.class_name} was submitted for ${this.formatKenyanDate(dto.practical_date)}.`,
    };
  }

  async reviewPracticalRequest(requestId: string, dto: ReviewPracticalRequestDto) {
    if (dto.status === 'rejected' && !dto.reason?.trim()) {
      throw new BadRequestException('Give a reason when rejecting a practical request');
    }
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const request = await this.labsRepository.reviewPracticalRequest({
      tenant_id: this.requireTenantId(),
      request_id: this.requireText(requestId, 'Practical request'),
      status: dto.status,
      reason: dto.reason?.trim() || null,
      items: dto.items ?? [],
      updated_by: this.requireUserId(),
      actor_role: this.currentRole(),
      submission_id: submissionId,
    });
    await this.audit(
      dto.status === 'rejected' ? 'laboratory.practical.rejected' : 'laboratory.practical.reviewed',
      'lab_practical_request',
      requestId,
      {
        status: dto.status,
        reason: dto.reason ?? null,
        item_count: dto.items?.length ?? 0,
        submission_id: submissionId,
      },
    );
    await this.publishOperation({
      eventType: dto.status === 'rejected' ? 'laboratory.practical.rejected' : 'laboratory.practical.reviewed',
      entityType: 'lab_practical_request',
      entityId: requestId,
      idempotencyKey: submissionId,
      title: dto.status === 'rejected' ? 'Practical request rejected' : 'Practical availability reviewed',
      body: dto.status === 'rejected'
        ? `${request?.subject} practical was rejected: ${dto.reason}`
        : `${request?.subject} practical availability was checked.`,
      severity: dto.status === 'rejected' ? 'warning' : 'info',
      payload: { status: dto.status },
    });
    await this.notifyPracticalTeacher({
      teacherId: request?.teacher_id,
      isAssessment: request?.is_assessment,
      notificationKey: `lab-practical-review-${requestId}-${submissionId}`,
      type: 'LAB_PRACTICAL_REVIEW',
      title: dto.status === 'rejected' ? 'Practical request needs attention' : 'Practical availability checked',
      body: dto.status === 'rejected'
        ? `${request?.subject} practical for ${request?.class_name} was not approved: ${dto.reason}`
        : `${request?.subject} practical for ${request?.class_name} is ${dto.status === 'partially_available' ? 'partially available' : 'available for preparation'}.`,
      recordId: requestId,
      priority: dto.status === 'rejected' || dto.status === 'partially_available' ? 'high' : 'normal',
      metadata: { status: dto.status },
    });
    return { request, message: dto.status === 'rejected' ? 'Practical request rejected with a recorded reason.' : 'Availability and approved quantities saved.' };
  }

  async preparePracticalRequest(requestId: string, dto: PreparePracticalDto) {
    if (!dto.items?.length) throw new BadRequestException('Add at least one item to the preparation checklist');
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const request = await this.labsRepository.preparePracticalRequest({
      tenant_id: this.requireTenantId(),
      request_id: this.requireText(requestId, 'Practical request'),
      items: dto.items.map((item) => ({
        ...item,
        item_name: this.requireText(item.item_name, 'Preparation item name'),
        unit: this.requireText(item.unit, 'Preparation unit'),
        prepared_quantity: this.requireNonNegative(item.prepared_quantity, 'Prepared quantity'),
      })),
      preparation_note: dto.preparation_note?.trim() || null,
      mark_ready: dto.mark_ready ?? false,
      updated_by: this.requireUserId(),
      actor_role: this.currentRole(),
      submission_id: submissionId,
    });
    await this.audit(
      dto.mark_ready ? 'laboratory.practical.ready' : 'laboratory.practical.preparing',
      'lab_practical_request',
      requestId,
      {
        item_count: dto.items.length,
        preparation_note: dto.preparation_note ?? null,
        submission_id: submissionId,
      },
    );
    await this.publishOperation({
      eventType: dto.mark_ready ? 'laboratory.practical.ready' : 'laboratory.practical.preparing',
      entityType: 'lab_practical_request',
      entityId: requestId,
      idempotencyKey: submissionId,
      title: dto.mark_ready ? 'Practical ready' : 'Practical preparation saved',
      body: `${request?.subject} · ${request?.class_name} · ${request?.practical_title}`,
      severity: dto.mark_ready ? 'success' : 'info',
      payload: { status: dto.mark_ready ? 'ready' : 'preparing' },
    });
    if (dto.mark_ready) {
      await this.notifyPracticalTeacher({
        teacherId: request?.teacher_id,
        isAssessment: request?.is_assessment,
        notificationKey: `lab-practical-ready-${requestId}-${submissionId}`,
        type: 'LAB_PRACTICAL_READY',
        title: 'Practical items are ready',
        body: `${request?.subject} practical items for ${request?.class_name} are ready for collection.`,
        recordId: requestId,
        priority: 'normal',
      });
    }
    return {
      request,
      message: dto.mark_ready
        ? `${request?.subject} practical for ${request?.class_name} is ready for issue.`
        : 'Preparation progress saved. You can continue later.',
    };
  }

  async confirmPracticalIssue(requestId: string, dto: ConfirmPracticalIssueDto) {
    const tenantId = this.requireTenantId();
    const request: any = await this.labsRepository.getPracticalRequest(tenantId, requestId, this.currentRole());
    if (!request) throw new NotFoundException('Practical request was not found in this school');
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const issue = await this.labsRepository.createPracticalIssue({
      tenant_id: tenantId,
      request_id: requestId,
      received_by: this.requireText(dto.received_by, 'Person receiving the items'),
      expected_return_at: dto.expected_return_at ? this.parseDateTime(dto.expected_return_at, 'Expected return') : null,
      notes: dto.notes?.trim() || null,
      submission_id: submissionId,
      issued_by: this.requireUserId(),
      actor_role: this.currentRole(),
      items: dto.items,
    });
    const returnableCount = (issue?.items ?? []).reduce(
      (sum: number, item: any) => sum + (item.is_returnable ? Number(item.quantity_issued) : 0),
      0,
    );
    await this.audit('laboratory.items.issued', 'lab_issue_record', issue?.id, {
      practical_request_id: requestId,
      received_by: dto.received_by,
      item_count: dto.items.length,
      submission_id: submissionId,
    });
    await this.publishOperation({
      eventType: 'laboratory.items.issued',
      entityType: 'lab_issue_record',
      entityId: issue?.id,
      idempotencyKey: submissionId,
      title: 'Practical items issued',
      body: `${request.subject} items issued to ${dto.received_by} for ${request.class_name}.`,
      severity: 'success',
      payload: { practical_request_id: requestId, returnable_quantity: returnableCount },
    });
    await this.notifyPracticalTeacher({
      teacherId: request.teacher_id,
      isAssessment: request.is_assessment,
      notificationKey: `lab-practical-issued-${issue?.id}`,
      type: 'LAB_PRACTICAL_ISSUED',
      title: 'Practical items issued',
      body: `${request.subject} practical items for ${request.class_name} were issued to ${dto.received_by}.`,
      recordId: issue?.id,
      priority: 'normal',
      metadata: { practical_request_id: requestId, returnable_quantity: returnableCount },
    });
    return {
      issue,
      message: `Practical items issued to ${dto.received_by} for ${request.class_name} ${request.subject}. ${returnableCount} returnable ${returnableCount === 1 ? 'item is' : 'items are'} expected back${dto.expected_return_at ? ` by ${this.formatKenyanDateTime(dto.expected_return_at)}` : ''}.`,
    };
  }

  async receivePracticalReturn(issueId: string, dto: ReceivePracticalReturnDto) {
    const tenantId = this.requireTenantId();
    const actorRole = this.currentRole();
    const issue: any = await this.labsRepository.getIssueForReturn(tenantId, issueId, actorRole);
    if (!issue) throw new NotFoundException('Laboratory issue was not found in this school');
    const lineMap = new Map((issue.items ?? []).map((line: any) => [line.id, line]));
    for (const line of dto.items ?? []) {
      const existing: any = lineMap.get(line.issue_line_id);
      if (!existing) throw new BadRequestException('A return row does not belong to this issue');
      const accounted = Number(line.returned_good) + Number(line.used_or_consumed)
        + Number(line.broken) + Number(line.missing) + Number(line.still_with_teacher)
        + Number(line.sent_for_maintenance) + Number(line.spilled_or_wasted);
      if (accounted > Number(existing.quantity_issued) + 0.0001) {
        throw new BadRequestException(`${existing.item_name} return figures exceed the quantity issued`);
      }
    }
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const updated = await this.labsRepository.receivePracticalReturn({
      tenant_id: tenantId,
      issue_id: issueId,
      items: dto.items,
      notes: dto.notes?.trim() || null,
      submission_id: submissionId,
      recorded_by: this.requireUserId(),
      actor_role: actorRole,
    });
    const totals = (updated?.items ?? []).reduce(
      (sum: { good: number; broken: number; missing: number }, item: any) => ({
        good: sum.good + Number(item.returned_good ?? 0),
        broken: sum.broken + Number(item.broken ?? 0),
        missing: sum.missing + Number(item.missing ?? 0),
      }),
      { good: 0, broken: 0, missing: 0 },
    );
    await this.audit('laboratory.items.returned', 'lab_issue_record', issueId, {
      status: updated?.status,
      totals,
      submission_id: submissionId,
    });
    await this.publishOperation({
      eventType: 'laboratory.items.returned',
      entityType: 'lab_issue_record',
      entityId: issueId,
      idempotencyKey: submissionId,
      title: updated?.status === 'returned' ? 'Laboratory return completed' : 'Partial laboratory return saved',
      body: `${totals.good} returned in good condition, ${totals.broken} broken, and ${totals.missing} missing.`,
      severity: totals.broken > 0 || totals.missing > 0 ? 'warning' : 'success',
      payload: { status: updated?.status, ...totals },
    });
    await this.notifyPracticalTeacher({
      teacherId: issue.teacher_id,
      isAssessment: issue.is_assessment,
      notificationKey: `lab-practical-return-${issueId}-${submissionId}`,
      type: 'LAB_PRACTICAL_RETURN',
      title: updated?.status === 'returned' ? 'Practical return completed' : 'Practical return partly recorded',
      body: `${totals.good} returned in good condition, ${totals.broken} broken, and ${totals.missing} missing.${updated?.status === 'returned' ? ' All issued quantities are accounted for.' : ' Some quantities remain unresolved.'}`,
      recordId: issueId,
      priority: totals.broken > 0 || totals.missing > 0 ? 'high' : 'normal',
      metadata: { practical_request_id: issue.practical_request_id, status: updated?.status, ...totals },
    });
    return {
      issue: updated,
      message: `Return recorded. ${totals.broken} ${totals.broken === 1 ? 'item was' : 'items were'} broken and ${totals.good} ${totals.good === 1 ? 'was' : 'were'} returned in good condition.${updated?.status === 'returned' ? ' The issue is fully accounted for.' : ' Unresolved quantities remain open.'}`,
    };
  }

  async sendReturnReminder(issueId: string) {
    const tenantId = this.requireTenantId();
    const issue: any = await this.labsRepository.getIssueForReturn(tenantId, issueId, this.currentRole());
    if (!issue) throw new NotFoundException('Laboratory issue was not found in this school');
    if (issue.status === 'returned') throw new BadRequestException('All items in this issue are already accounted for');
    if (
      issue.is_assessment
      && !(issue.teacher_id === this.currentUserId() && this.isAssessmentPreparationRole(this.currentRole()))
    ) {
      throw new ForbiddenException('Secure assessment reminders can only be sent within an authorized assessment workflow');
    }
    if (!issue.teacher_id) {
      throw new BadRequestException('The teacher account is not linked, so an in-app reminder cannot be sent');
    }
    if (!this.workflowRepository) throw new BadRequestException('The notification service is not available');
    await this.workflowRepository.createNotification({
      tenant_id: tenantId,
      notification_key: `lab-return-reminder-${issue.id}-${new Date().toISOString().slice(0, 10)}`,
      recipient_user_id: issue.teacher_id,
      type: 'LAB_RETURN_REMINDER',
      title: 'Laboratory items awaiting return',
      body: `${issue.practical_title} items issued for ${issue.class_name} still need to be returned or accounted for.`,
      priority: issue.status === 'overdue' ? 'high' : 'normal',
      source_module: 'laboratory',
      source_record_id: issue.id,
      metadata: { practical_request_id: issue.practical_request_id, expected_return_at: issue.expected_return_at },
    });
    await this.audit('laboratory.return.reminder_sent', 'lab_issue_record', issueId, {
      recipient_user_id: issue.teacher_id,
    });
    return { message: `Reminder sent to ${issue.teacher_name} for ${issue.practical_title}.` };
  }

  async recordBreakageLoss(dto: RecordBreakageLossDto) {
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const record = await this.labsRepository.recordBreakageLoss({
      tenant_id: this.requireTenantId(),
      item_id: dto.item_id?.trim() || null,
      item_source: dto.item_source ?? null,
      item_name: this.requireText(dto.item_name, 'Item'),
      quantity: this.requirePositive(dto.quantity, 'Quantity'),
      date: this.parseSchoolDate(dto.date, 'Date'),
      practical_or_activity: dto.practical_or_activity?.trim() || null,
      class_name: dto.class_name?.trim() || null,
      teacher_name: dto.teacher_name?.trim() || null,
      classification: dto.classification,
      explanation: this.requireText(dto.explanation, 'Brief explanation'),
      referral_required: dto.refer_for_follow_up ?? false,
      referral_status: dto.refer_for_follow_up ? 'requested' : null,
      submission_id: submissionId,
      recorded_by: this.requireUserId(),
      actor_role: this.currentRole(),
    });
    if (dto.refer_for_follow_up && this.workflowRepository && record?.id) {
      await this.workflowRepository.createTask({
        tenant_id: this.requireTenantId(),
        task_key: `lab-breakage-referral-${record.id}`,
        assigned_to_role: 'PRINCIPAL',
        created_by_user_id: this.requireUserId(),
        title: `Review laboratory ${this.breakageLabel(dto.classification).toLowerCase()}`,
        description: `${dto.quantity} ${dto.item_name}: ${dto.explanation}`,
        module: 'laboratory',
        record_id: record.id,
        priority: dto.classification === 'missing' || dto.classification === 'improper_use' ? 'high' : 'normal',
        metadata: { class_name: dto.class_name ?? null, teacher_name: dto.teacher_name ?? null },
      });
    }
    await this.audit('laboratory.breakage_loss.recorded', 'lab_breakage_loss_record', record?.id, {
      classification: dto.classification,
      quantity: dto.quantity,
      referral_required: dto.refer_for_follow_up ?? false,
      submission_id: submissionId,
    });
    await this.publishOperation({
      eventType: 'laboratory.breakage_loss.recorded',
      entityType: 'lab_breakage_loss_record',
      entityId: record?.id,
      idempotencyKey: submissionId,
      title: `${this.breakageLabel(dto.classification)} recorded`,
      body: `${dto.quantity} ${dto.item_name}: ${dto.explanation}`,
      severity: 'warning',
      payload: { classification: dto.classification, referral_required: dto.refer_for_follow_up ?? false },
    });
    return {
      record,
      message: `${this.breakageLabel(dto.classification)} recorded for ${dto.quantity} ${dto.item_name}.${dto.refer_for_follow_up ? ' A review task was sent to school leadership; no charge was created.' : ' No charge was created.'}`,
    };
  }

  async listBreakageLoss() {
    return this.labsRepository.listBreakageLoss(this.requireTenantId(), this.currentRole());
  }

  async startStocktake(dto: StartLabStocktakeDto) {
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const stocktake = await this.labsRepository.startStocktake({
      tenant_id: this.requireTenantId(),
      location_id: dto.location_id?.trim() || null,
      location_name: this.requireText(dto.location_name, 'Stocktake location'),
      category: dto.category?.trim() || null,
      item_type: dto.item_type ?? null,
      submission_id: submissionId,
      started_by: this.requireUserId(),
    });
    await this.audit('laboratory.stocktake.started', 'lab_stocktake', stocktake?.id, {
      location_name: dto.location_name,
      item_count: stocktake?.items?.length ?? 0,
      submission_id: submissionId,
    });
    return {
      stocktake,
      message: stocktake?.items?.length
        ? `Stocktake started for ${dto.location_name}. ${stocktake.items.length} items are ready to count.`
        : `Stocktake started for ${dto.location_name}. No items are currently assigned to this location.`,
    };
  }

  async listStocktakes() {
    return this.labsRepository.listStocktakes(this.requireTenantId());
  }

  async saveStocktake(stocktakeId: string, dto: SaveLabStocktakeDto) {
    const stocktake = await this.labsRepository.saveStocktake({
      tenant_id: this.requireTenantId(),
      stocktake_id: this.requireText(stocktakeId, 'Stocktake'),
      items: dto.items,
      notes: dto.notes?.trim() || null,
      current_position: Math.max(0, dto.items?.length ? dto.items.length - 1 : 0),
    });
    await this.audit('laboratory.stocktake.progress_saved', 'lab_stocktake', stocktakeId, {
      counted_items: dto.items?.length ?? 0,
    });
    return { stocktake, message: `Stocktake progress saved for ${stocktake?.location_name}. You can continue later.` };
  }

  async submitStocktake(stocktakeId: string, dto: SaveLabStocktakeDto) {
    const stocktake = await this.labsRepository.submitStocktake({
      tenant_id: this.requireTenantId(),
      stocktake_id: this.requireText(stocktakeId, 'Stocktake'),
      items: dto.items ?? [],
      notes: dto.notes?.trim() || null,
      submitted_by: this.requireUserId(),
    });
    const differences = (stocktake?.items ?? []).filter((item: any) => Math.abs(Number(item.difference ?? 0)) > 0.0001);
    await this.audit('laboratory.stocktake.submitted', 'lab_stocktake', stocktakeId, {
      location_name: stocktake?.location_name,
      item_count: stocktake?.items?.length ?? 0,
      difference_count: differences.length,
    });
    await this.publishOperation({
      eventType: 'laboratory.stocktake.submitted',
      entityType: 'lab_stocktake',
      entityId: stocktakeId,
      idempotencyKey: `${stocktakeId}:submitted`,
      title: 'Laboratory stocktake submitted',
      body: `${stocktake?.location_name}: ${differences.length} stock ${differences.length === 1 ? 'difference' : 'differences'} recorded.`,
      severity: differences.length ? 'warning' : 'success',
      payload: { difference_count: differences.length },
    });
    return {
      stocktake,
      message: `Stocktake submitted for ${stocktake?.location_name}. ${differences.length} ${differences.length === 1 ? 'difference was' : 'differences were'} recorded with movement and audit entries.`,
    };
  }

  async saveSafetyCheck(dto: SaveLabSafetyCheckDto) {
    if (!dto.checklist?.length) throw new BadRequestException('Add at least one safety checklist item');
    const submissionId = dto.submission_id?.trim() || randomUUID();
    const check = await this.labsRepository.saveSafetyCheck({
      tenant_id: this.requireTenantId(),
      location_name: this.requireText(dto.location_name, 'Safety check location'),
      checked_on: this.parseSchoolDate(dto.checked_on, 'Checked on date'),
      next_due_date: this.parseSchoolDate(dto.next_due_date, 'Next due date'),
      checklist: dto.checklist,
      notes: dto.notes?.trim() || null,
      submission_id: submissionId,
      checked_by: this.requireUserId(),
    });
    await this.audit('laboratory.safety_check.completed', 'lab_safety_check', check?.id, {
      location_name: dto.location_name,
      follow_up_required: check?.status === 'follow_up_required',
      submission_id: submissionId,
    });
    const followUpRequired = check?.status === 'follow_up_required';
    await this.publishOperation({
      eventType: followUpRequired
        ? 'laboratory.safety_check.follow_up_required'
        : 'laboratory.safety_check.completed',
      entityType: 'lab_safety_check',
      entityId: check?.id,
      idempotencyKey: submissionId,
      title: followUpRequired ? 'Laboratory safety follow-up required' : 'Laboratory safety check completed',
      body: followUpRequired
        ? `${dto.location_name} has safety checklist items that require follow-up.`
        : `${dto.location_name} safety checklist was completed.`,
      severity: followUpRequired ? 'warning' : 'success',
      targetRoles: ['LAB_TECHNICIAN', 'PRINCIPAL', 'DEPUTY_PRINCIPAL'],
      payload: {
        location_name: dto.location_name,
        next_due_date: check?.next_due_date ?? this.parseSchoolDate(dto.next_due_date, 'Next due date'),
        follow_up_required: followUpRequired,
      },
    });
    return {
      check,
      message: followUpRequired
        ? `Safety checklist saved for ${dto.location_name}. Items needing follow-up remain visible.`
        : `Safety checklist completed for ${dto.location_name}.`,
    };
  }

  async listSafetyChecks() {
    return this.labsRepository.listSafetyChecks(this.requireTenantId());
  }

  async generateRegister(dto: GenerateLabRegisterDto) {
    const tenantId = this.requireTenantId();
    const generatedBy = this.requireUserId();
    const dateFrom = dto.date_from ? this.parseSchoolDate(dto.date_from, 'Start date') : null;
    const dateTo = dto.date_to ? this.parseSchoolDate(dto.date_to, 'End date') : null;
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException('Start date must be on or before the end date');
    }
    const report = await this.labsRepository.getRegisterData(tenantId, dto.report_type, {
      laboratory: dto.laboratory?.trim() || null,
      location_filter: dto.location_filter?.trim() || null,
      date_from: dateFrom,
      date_to: dateTo,
      generated_by: generatedBy,
      actor_role: this.currentRole(),
    });
    await this.audit('laboratory.register.generated', 'lab_register', null, {
      document_number: report.document_number,
      report_type: dto.report_type,
      row_count: report.rows.length,
    });
    await this.publishOperation({
      eventType: 'laboratory.register.generated',
      entityType: 'lab_register',
      entityId: randomUUID(),
      title: 'Laboratory register generated',
      body: `${dto.report_type.replaceAll('_', ' ')} generated from ${report.rows.length} school records.`,
      severity: 'success',
      payload: { document_number: report.document_number, report_type: dto.report_type, row_count: report.rows.length },
    });
    return { report, message: `${this.reportTitle(dto.report_type)} prepared from live school laboratory records.` };
  }

  private async publishOperation(input: {
    eventType: string;
    entityType: string;
    entityId?: string | null;
    idempotencyKey?: string;
    title: string;
    body: string;
    severity: 'info' | 'warning' | 'critical' | 'success';
    targetRoles?: string[];
    payload?: Record<string, unknown>;
  }) {
    if (!this.eventPublisher || !input.entityId) return;
    const tenantId = this.requireTenantId();
    const actorRole = this.currentRole();
    await this.eventPublisher.publish({
      event_key: `${input.eventType}:${input.entityId}:${input.idempotencyKey ?? randomUUID()}`,
      event_name: 'school.operation.recorded',
      aggregate_type: input.entityType,
      aggregate_id: input.entityId,
      source_dashboard: 'laboratory-technician',
      payload: {
        tenant_id: tenantId,
        school_id: tenantId,
        operation_id: input.entityId,
        operation_type: input.eventType,
        module: 'laboratory',
        actor_role: actorRole,
        title: input.title,
        body: input.body,
        entity_id: input.entityId,
        severity: input.severity,
        target_roles: input.targetRoles ?? ['LAB_TECHNICIAN', 'PRINCIPAL'],
        notifications: [],
        sms: [],
        payload: input.payload ?? {},
        occurred_at: new Date().toISOString(),
      },
    });
  }

  private async notifyPracticalTeacher(input: {
    teacherId?: string | null;
    isAssessment?: boolean;
    notificationKey: string;
    type: string;
    title: string;
    body: string;
    recordId?: string | null;
    priority: 'normal' | 'high';
    metadata?: Record<string, unknown>;
  }) {
    if (!this.workflowRepository || !input.teacherId || !input.recordId) return;
    if (
      input.isAssessment
      && !(input.teacherId === this.currentUserId() && this.isAssessmentPreparationRole(this.currentRole()))
    ) {
      return;
    }
    await this.workflowRepository.createNotification({
      tenant_id: this.requireTenantId(),
      notification_key: input.notificationKey,
      recipient_user_id: input.teacherId,
      type: input.type,
      title: input.title,
      body: input.body,
      priority: input.priority,
      source_module: 'laboratory',
      source_record_id: input.recordId,
      metadata: input.metadata ?? {},
    });
  }

  private currentRole(): string {
    return String(this.requestContext.getStore()?.role ?? 'LAB_TECHNICIAN')
      .trim()
      .replace(/-/g, '_')
      .toUpperCase();
  }

  private isTeachingRole(role: string) {
    return new Set([
      'TEACHER',
      'CLASS_TEACHER',
      'GRADE_MASTER',
      'HOD',
      'HEAD_OF_DEPARTMENT',
      'DEAN_ACADEMICS',
      'EXAMS_MANAGER',
      'PRINCIPAL',
      'DEPUTY_PRINCIPAL',
      'DISCIPLINE_MASTER',
      'BOARDING_MASTER',
      'COUNSELLOR',
      'SCHOOL_COUNSELLOR',
      'GUIDANCE_COUNSELLING_TEACHER',
    ]).has(role);
  }

  private normalizeLaboratoryItemName(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/(es|s)$/i, '');
  }

  private recommendTrackingMethod(itemName: string, itemType: string): 'quantity' | 'individual' {
    if (itemType !== 'apparatus' && itemType !== 'safety_equipment') return 'quantity';
    const normalized = itemName.toLowerCase();
    const individuallyTracked = ['microscope', 'electronic balance', 'centrifuge', 'computer', 'spectrometer', 'data logger'];
    return individuallyTracked.some((name) => normalized.includes(name)) ? 'individual' : 'quantity';
  }

  private normalizeAuthorizedRoles(roles?: string[]) {
    const defaults = ['LAB_TECHNICIAN', 'PRINCIPAL', 'DEPUTY_PRINCIPAL', 'DEAN_ACADEMICS', 'EXAMS_MANAGER'];
    const allowed = new Set(defaults);
    return [...new Set([
      ...defaults,
      ...(roles ?? [])
        .map((role) => role.trim().replace(/-/g, '_').toUpperCase())
        .filter((role) => allowed.has(role)),
    ])];
  }

  private isAssessmentPreparationRole(role: string) {
    return ['LAB_TECHNICIAN', 'PRINCIPAL', 'DEPUTY_PRINCIPAL', 'DEAN_ACADEMICS', 'EXAMS_MANAGER'].includes(role);
  }

  private requireItemSource(value: string): 'equipment' | 'chemical' {
    if (value === 'equipment' || value === 'chemical') return value;
    throw new BadRequestException('Laboratory item type must be equipment or chemical');
  }

  private parseSchoolDate(value: string, fieldName: string): string {
    const normalized = value.trim();
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? normalized
      : dmy
        ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
        : null;
    const parsed = iso ? new Date(`${iso}T00:00:00.000Z`) : null;
    if (
      !iso
      || !parsed
      || Number.isNaN(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== iso
    ) {
      throw new BadRequestException(`${fieldName} must be a valid date in DD/MM/YYYY or YYYY-MM-DD format`);
    }
    return iso;
  }

  private parseDateTime(value: string, fieldName: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) throw new BadRequestException(`${fieldName} must be a valid date and time`);
    return new Date(parsed).toISOString();
  }

  private formatKenyanDate(value: string): string {
    const iso = this.parseSchoolDate(value, 'Date');
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi' }).format(new Date(`${iso}T12:00:00Z`));
  }

  private formatKenyanDateTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private breakageLabel(classification: string): string {
    return ({
      accidental_breakage: 'Accidental Breakage',
      wear_and_tear: 'Wear and Tear',
      equipment_failure: 'Equipment Failure',
      missing: 'Missing Item',
      chemical_spill: 'Chemical Spill',
      improper_use: 'Improper Use',
      unknown: 'Unclassified Damage',
    } as Record<string, string>)[classification] ?? 'Breakage or Loss';
  }

  private reportTitle(reportType: string): string {
    return reportType.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for lab operations');
    }

    return tenantId;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for lab operations');
    }

    return userId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private requirePositive(value: number | undefined, fieldName: string): number {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      throw new BadRequestException(`${fieldName} must be greater than zero`);
    }

    return numericValue;
  }

  private requireNonNegative(value: number | undefined, fieldName: string): number {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new BadRequestException(`${fieldName} must not be negative`);
    }

    return numericValue;
  }

  private requireDepartmentType(value: string): 'SCIENCE' | 'TECHNICAL' | 'CUSTOM' {
    if (value === 'SCIENCE' || value === 'TECHNICAL' || value === 'CUSTOM') {
      return value;
    }

    throw new BadRequestException('Department type must be SCIENCE, TECHNICAL, or CUSTOM');
  }

  private requireAttendanceStatus(value: string): 'present' | 'absent' | 'late' | 'excused' {
    if (value === 'present' || value === 'absent' || value === 'late' || value === 'excused') {
      return value;
    }

    throw new BadRequestException('Lab attendance status is invalid');
  }
}
