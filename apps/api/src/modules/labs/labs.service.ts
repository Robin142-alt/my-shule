import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  ChemicalDisposalRequestDto,
  CreateChemicalItemDto,
  CreateLabDepartmentDto,
  CreateLabDto,
  CreateLabEquipmentDto,
  CreateLabSessionDto,
  IssueChemicalDto,
  IssueEquipmentDto,
  MarkLabAttendanceDto,
  ReconcileEquipmentDto,
} from './dto/labs.dto';
import { LabsRepository } from './repositories/labs.repository';

@Injectable()
export class LabsService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly labsRepository: LabsRepository,
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
      department_id: this.requireText(dto.department_id, 'Department'),
      lab_id: this.requireText(dto.lab_id, 'Lab'),
      name: this.requireText(dto.name, 'Equipment name'),
      asset_tag: this.requireText(dto.asset_tag, 'Asset tag'),
      quantity_total: this.requirePositive(dto.quantity_total, 'Total quantity'),
      condition_status: dto.condition_status?.trim() || 'serviceable',
      is_consumable: dto.is_consumable ?? false,
    });
    await this.audit('labs.equipment_created', 'lab_equipment', equipment?.id, dto);

    return equipment;
  }

  async createChemical(dto: CreateChemicalItemDto) {
    const chemical = await this.labsRepository.createChemical({
      tenant_id: this.requireTenantId(),
      lab_id: this.requireText(dto.lab_id, 'Lab'),
      name: this.requireText(dto.name, 'Chemical name'),
      chemical_formula: dto.chemical_formula?.trim() || null,
      hazard_class: this.requireText(dto.hazard_class, 'Hazard class'),
      batch_number: this.requireText(dto.batch_number, 'Batch number'),
      quantity_total: this.requirePositive(dto.quantity_total, 'Chemical quantity'),
      unit: dto.unit?.trim() || 'ml',
      manufacture_date: dto.manufacture_date ?? null,
      expiry_date: this.requireText(dto.expiry_date, 'Expiry date'),
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
    if (chemical.status === 'expired' || new Date(chemical.expiry_date) < new Date()) {
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
    entityId: string | undefined,
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
