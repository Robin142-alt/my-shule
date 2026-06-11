import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { ModuleAccessService } from '../module-access/module-access.service';
import {
  CreateMedicineDto,
  DispenseMedicineDto,
  ListClinicMedicinesQueryDto,
  ReceiveMedicineStockDto,
  RecordClinicVisitDto,
} from './dto/clinic.dto';
import {
  ClinicBatchForDispensing,
  ClinicLowStockBatch,
  ClinicRepository,
} from './repositories/clinic.repository';

@Injectable()
export class ClinicService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: ClinicRepository,
      @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
    @Optional()
    private readonly moduleAccessService?: ModuleAccessService,
  ) {}

  async createMedicine(dto: CreateMedicineDto) {
    this.assertPermission('clinic:inventory');
    const medicine = await this.repository.createMedicine({
      ...dto,
      medicine_name: this.requireText(dto.medicine_name, 'Medicine name'),
      category: this.requireText(dto.category, 'Medicine category'),
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });
    await this.audit('clinic.medicine_created', 'clinic_medicine', medicine?.id, dto);

    return medicine;
  }

  listMedicines(query: ListClinicMedicinesQueryDto = {}) {
    this.assertPermission('clinic:read');
    const search = query.search?.trim() ?? '';

    return this.repository.listMedicines(this.requireTenantId(), {
      search: search.length >= 2 ? search : undefined,
      category: query.category?.trim() || undefined,
      limit: this.parseBoundedInteger(query.limit, 25, 50),
      offset: this.parseBoundedInteger(query.offset, 0, Number.MAX_SAFE_INTEGER),
    });
  }

  async receiveMedicineStock(medicineId: string, dto: ReceiveMedicineStockDto) {
    this.assertPermission('clinic:inventory');
    const expiryDate = this.requireDate(dto.expiry_date, 'Expiry date');
    const manufacturingDate = dto.manufacturing_date
      ? this.requireDate(dto.manufacturing_date, 'Manufacturing date')
      : null;

    if (Date.parse(expiryDate) <= Date.now()) {
      throw new BadRequestException('Expired medicine stock cannot be received as active inventory');
    }

    const batch = await this.repository.receiveMedicineStock({
      ...dto,
      medicine_id: medicineId,
      expiry_date: expiryDate,
      manufacturing_date: manufacturingDate,
      date_received: dto.date_received ? this.requireDate(dto.date_received, 'Date received') : null,
      tenant_id: this.requireTenantId(),
      actor_user_id: this.requireUserId(),
    });
    await this.audit('clinic.stock_received', 'clinic_medicine_batch', batch?.id, dto);

    return batch;
  }

  async recordVisit(dto: RecordClinicVisitDto) {
    this.assertPermission('clinic:write');
    const visit = await this.repository.createVisit({
      ...dto,
      tenant_id: this.requireTenantId(),
      recorded_by_user_id: this.requireUserId(),
      visit_date: dto.visit_date ? this.requireDate(dto.visit_date, 'Visit date') : null,
    });
    await this.audit('clinic.visit_recorded', 'clinic_visit', visit?.id, {
      student_id: dto.student_id,
      status: dto.status ?? 'open',
    });

    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: visit?.id,
        type: 'clinic.visit_recorded',
        module: 'clinic',
        actorRole: this.requestContext.requireStore().role || 'staff',
        title: 'Clinic Visit Recorded',
        body: `Clinic visit recorded for student ${dto.student_id}`,
        entityId: visit?.id,
        severity: 'info',
        payload: { student_id: dto.student_id },
      },
    });

    return visit;
  }

  async dispenseMedicine(visitId: string, dto: DispenseMedicineDto) {
    this.assertPermission('clinic:dispense');
    const tenantId = this.requireTenantId();
    const batch = await this.repository.findBatchForDispensing(tenantId, dto.batch_id);

    this.assertBatchCanBeDispensed(batch, dto.quantity_dispensed);

    const dispense = await this.repository.dispenseMedicine({
      ...dto,
      tenant_id: tenantId,
      visit_id: visitId,
      dispensed_by_user_id: this.requireUserId(),
    });
    await this.audit('clinic.medicine_dispensed', 'clinic_medicine_dispense', dispense?.id, {
      visit_id: visitId,
      batch_id: dto.batch_id,
      quantity_dispensed: dto.quantity_dispensed,
    });

    return dispense;
  }

  getPrincipalAnalytics() {
    this.assertPermission('clinic:reports');

    return this.repository.getPrincipalAnalytics(this.requireTenantId());
  }

  async getParentMedicalHistory(studentId: string) {
    this.assertPermission('portal:read_own_children');
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const linked = await this.repository.isGuardianLinkedToStudent(
      tenantId,
      userId,
      studentId,
    );

    if (!linked) {
      throw new ForbiddenException('Parent is not linked to this student');
    }

    const rows = await this.repository.listParentMedicalHistory(tenantId, studentId);

    return rows.map((row) => this.redactMedicalHistoryForParent(row as Record<string, unknown>));
  }

  async runMedicineExpiryCheck() {
    this.assertPermission('clinic:inventory');
    const tenantId = this.requireTenantId();

    await this.repository.markExpiryStatuses(tenantId);
    const alerts = await this.repository.createExpiryAlerts(tenantId);
    await this.audit('clinic.expiry_check_completed', 'clinic_alert', undefined, {
      alerts_created: alerts.length,
    });

    return { alerts_created: alerts.length, alerts };
  }

  async runLowStockCheck() {
    this.assertPermission('clinic:inventory');
    const tenantId = this.requireTenantId();
    const alerts = await this.repository.createLowStockAlerts(tenantId);
    const recommendations = await this.createLowStockProcurementRecommendationsForTenant(tenantId);
    await this.audit('clinic.low_stock_check_completed', 'clinic_alert', undefined, {
      alerts_created: alerts.length,
      recommendations_created: recommendations.length,
    });

    return {
      alerts_created: alerts.length,
      alerts,
      recommendations_created: recommendations.length,
      recommendations,
    };
  }

  async createLowStockProcurementRecommendations() {
    this.assertPermission('clinic:inventory');
    const tenantId = this.requireTenantId();
    const recommendations = await this.createLowStockProcurementRecommendationsForTenant(tenantId);

    await this.audit('clinic.procurement_recommendations_created', 'clinic_procurement_recommendation', undefined, {
      recommendations_created: recommendations.length,
    });

    return {
      recommendations_created: recommendations.length,
      recommendations,
    };
  }

  listEmergencies() {
    this.assertPermission('clinic:read');
    return [];
  }

  async recordEmergency(dto: Record<string, any>) {
    this.assertPermission('clinic:write');
    return { id: 'em-placeholder', ...dto, tenant_id: this.requireTenantId() };
  }

  listReferrals() {
    this.assertPermission('clinic:read');
    return [];
  }

  async createReferral(dto: Record<string, any>) {
    this.assertPermission('clinic:write');
    return { id: 'ref-placeholder', ...dto, tenant_id: this.requireTenantId() };
  }

  getSickBayQueue() {
    this.assertPermission('clinic:read');
    return [];
  }

  async addToQueue(dto: Record<string, any>) {
    this.assertPermission('clinic:write');
    return { id: 'q-placeholder', ...dto, tenant_id: this.requireTenantId() };
  }

  private assertBatchCanBeDispensed(
    batch: ClinicBatchForDispensing | null,
    quantityDispensed: number,
  ): asserts batch is ClinicBatchForDispensing {
    if (!batch) {
      throw new BadRequestException('Medicine batch was not found');
    }

    if (Number(quantityDispensed) <= 0) {
      throw new BadRequestException('Medicine quantity must be greater than zero');
    }

    if (Number(batch.quantity_available ?? 0) < Number(quantityDispensed)) {
      throw new BadRequestException('Insufficient medicine stock');
    }

    if (batch.status === 'expired' || this.isExpired(batch.expiry_date)) {
      throw new BadRequestException('Expired medicine cannot be dispensed');
    }

    if (['quarantined', 'disposed', 'recalled'].includes(batch.status)) {
      throw new BadRequestException(`Medicine batch is ${batch.status} and cannot be dispensed`);
    }
  }

  private redactMedicalHistoryForParent(row: Record<string, unknown>) {
    const {
      confidential_notes: _confidentialNotes,
      clinician_private_notes: _clinicianPrivateNotes,
      ...safeRow
    } = row;

    return safeRow;
  }

  private isExpired(value: string): boolean {
    const expiry = Date.parse(value);

    if (Number.isNaN(expiry)) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expiry < today.getTime();
  }

  private async createLowStockProcurementRecommendationsForTenant(tenantId: string) {
    if (!(await this.isProcurementModuleEnabled(tenantId))) {
      return [];
    }

    const lowStockBatches = await this.repository.listLowStockBatches(tenantId);
    const recommendations = [];

    for (const batch of lowStockBatches) {
      const recommendation = await this.repository.createProcurementRecommendation(
        this.buildProcurementRecommendationInput(tenantId, batch),
      );

      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private buildProcurementRecommendationInput(
    tenantId: string,
    batch: ClinicLowStockBatch,
  ) {
    return {
      tenant_id: tenantId,
      module_code: 'clinic_health',
      medicine_id: batch.medicine_id,
      batch_id: batch.batch_id,
      item_name: batch.medicine_name,
      batch_number: batch.batch_number,
      quantity_available: batch.quantity_available,
      minimum_stock_threshold: batch.minimum_stock_threshold,
      shortage_quantity: batch.shortage_quantity,
      recommended_order_quantity: batch.recommended_order_quantity,
      metadata: {
        source: 'clinic_low_stock_checker',
        shortage_quantity: batch.shortage_quantity,
        recommended_order_quantity: batch.recommended_order_quantity,
      },
    };
  }

  private async isProcurementModuleEnabled(tenantId: string): Promise<boolean> {
    if (!this.moduleAccessService) {
      return false;
    }

    try {
      const enabledModules = await this.moduleAccessService.listEnabledModulesForTenant(tenantId);

      return enabledModules.includes('procurement');
    } catch {
      return false;
    }
  }

  private async audit(
    action: string,
    resourceType: string,
    resourceId: string | undefined,
    metadata: unknown,
  ) {
    await this.repository.appendAuditLog({
      tenant_id: this.requireTenantId(),
      actor_user_id: this.currentUserId(),
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
  }

  private assertPermission(permission: string): void {
    const permissions = this.requestContext.getStore()?.permissions ?? [];
    const [resource] = permission.split(':');

    if (
      permissions.includes('*:*')
      || permissions.includes(permission)
      || permissions.includes(`${resource}:*`)
    ) {
      return;
    }

    throw new ForbiddenException('Clinic permission is required');
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for clinic operations');
    }

    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for clinic operations');
    }

    return userId;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private requireDate(value: string, fieldName: string): string {
    const timestamp = Date.parse(value);

    if (Number.isNaN(timestamp)) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return new Date(timestamp).toISOString().slice(0, 10);
  }

  private parseBoundedInteger(
    value: number | string | undefined,
    fallback: number,
    max: number,
  ): number {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(Math.floor(parsed), 0), max);
  }
}
