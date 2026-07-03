import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class NurseCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private requireUserId(): string {
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    if (!userId) {
      throw new UnauthorizedException('User context is required');
    }
    return userId;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    try {
      return await this.prisma.query<T>(query, params);
    } catch (e) {
      return { rows: [], rowCount: 0 };
    }
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql(`
      SELECT 
        (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date = CURRENT_DATE) as "todayVisits",
        (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND status IN ('open', 'isolation')) as "waitingQueue",
        (SELECT COUNT(*)::int FROM clinic_medicine_batches WHERE tenant_id = $1 AND status IN ('active', 'near_expiry') AND quantity_available <= minimum_stock_threshold) as "lowStockMeds"
    `, [tenantId]);

    const row = metrics.rows[0] || { todayVisits: 0, waitingQueue: 0, lowStockMeds: 0 };
    return {
      metrics: {
        todayVisits: row.todayVisits || 0,
        waitingQueue: row.waitingQueue || 0,
        lowStockMeds: row.lowStockMeds || 0,
      },
      recentVisits: []
    };
  }

  async getVisits() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          COUNT(*) OVER()::int AS total_count,
          visit.id::text,
          CONCAT(student.first_name, ' ', student.last_name) AS student_name,
          COALESCE(allocation.class_name, student.current_class_id, '') AS class_name,
          visit.symptoms_summary AS complaint,
          visit.diagnosis_summary AS diagnosis,
          visit.treatment_summary AS treatment,
          visit.status,
          visit.visit_date::text
        FROM clinic_visits visit
        INNER JOIN students student ON student.tenant_id = visit.tenant_id AND student.id = visit.student_id
        LEFT JOIN student_allocations allocation ON allocation.tenant_id = student.tenant_id AND allocation.student_id = student.id AND allocation.is_current = TRUE
        WHERE visit.tenant_id = $1
        ORDER BY visit.visit_date DESC, visit.created_at DESC
      `,
      [tenantId]
    );
    const visits = res.rows.map((row: any) => ({
      id: row.id,
      student_name: row.student_name,
      class_name: row.class_name,
      complaint: row.complaint ?? '',
      diagnosis: row.diagnosis ?? '',
      treatment: row.treatment ?? '',
      status: this.formatVisitStatus(row.status),
      visit_date: row.visit_date,
    }));
    return {
      metrics: {
        total_visits: res.rows[0]?.total_count ?? 0,
        open_visits: visits.filter((visit: any) => visit.status === 'Open').length,
        referred: visits.filter((visit: any) => visit.status === 'Referred').length,
      },
      visits,
    };
  }

  async getDispensingLog() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          dispense.id::text,
          CONCAT(student.first_name, ' ', student.last_name) AS student_name,
          COALESCE(allocation.class_name, student.current_class_id, '') AS class_name,
          medicine.medicine_name,
          dispense.dosage,
          dispense.quantity_dispensed AS quantity_given,
          dispense.dispensed_by_user_id::text AS dispensed_by,
          dispense.dispensed_at::text
        FROM clinic_medicine_dispenses dispense
        INNER JOIN clinic_visits visit ON visit.tenant_id = dispense.tenant_id AND visit.id = dispense.visit_id
        INNER JOIN students student ON student.tenant_id = visit.tenant_id AND student.id = visit.student_id
        INNER JOIN clinic_medicines medicine ON medicine.tenant_id = dispense.tenant_id AND medicine.id = dispense.medicine_id
        LEFT JOIN student_allocations allocation ON allocation.tenant_id = student.tenant_id AND allocation.student_id = student.id AND allocation.is_current = TRUE
        WHERE dispense.tenant_id = $1
        ORDER BY dispense.dispensed_at DESC
      `,
      [tenantId]
    );
    return {
      metrics: {
        dispensed_today: res.rows.filter((row: any) => String(row.dispensed_at).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        total_this_term: res.rows.length,
        unique_students: new Set(res.rows.map((row: any) => row.student_name)).size,
      },
      records: res.rows,
    };
  }

  async getMedicineInventory() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          medicine.id::text,
          medicine.medicine_name AS name,
          medicine.category,
          COALESCE(SUM(batch.quantity_available), 0)::numeric AS quantity,
          medicine.unit_type AS unit,
          COALESCE(MIN(batch.minimum_stock_threshold), 0)::numeric AS reorder_level,
          MIN(batch.expiry_date)::text AS expiry_date
        FROM clinic_medicines medicine
        LEFT JOIN clinic_medicine_batches batch
          ON batch.tenant_id = medicine.tenant_id
         AND batch.medicine_id = medicine.id
         AND batch.status IN ('active', 'near_expiry')
        WHERE medicine.tenant_id = $1
          AND medicine.is_active = TRUE
        GROUP BY medicine.id, medicine.medicine_name, medicine.category, medicine.unit_type
        ORDER BY medicine.medicine_name ASC
      `,
      [tenantId]
    );
    const medicines = res.rows.map((row: any) => ({
      ...row,
      quantity: Number(row.quantity ?? 0),
      reorder_level: Number(row.reorder_level ?? 0),
      status: this.stockStatus(Number(row.quantity ?? 0), Number(row.reorder_level ?? 0), row.expiry_date),
    }));
    return {
      metrics: {
        total_items: medicines.length,
        low_stock: medicines.filter((medicine: any) => medicine.status === 'Low Stock' || medicine.status === 'Out of Stock').length,
        expired: medicines.filter((medicine: any) => medicine.status === 'Expired').length,
      },
      medicines,
    };
  }

  async getSickBayQueue() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          visit.id::text,
          CONCAT(student.first_name, ' ', student.last_name) AS student_name,
          COALESCE(allocation.class_name, student.current_class_id, '') AS class_name,
          visit.symptoms_summary AS complaint,
          visit.created_at::text AS admitted_at,
          visit.status,
          visit.confidential_notes AS notes
        FROM clinic_visits visit
        INNER JOIN students student ON student.tenant_id = visit.tenant_id AND student.id = visit.student_id
        LEFT JOIN student_allocations allocation ON allocation.tenant_id = student.tenant_id AND allocation.student_id = student.id AND allocation.is_current = TRUE
        WHERE visit.tenant_id = $1
          AND visit.status IN ('isolation', 'completed')
        ORDER BY visit.created_at DESC
      `,
      [tenantId]
    );
    const entries = res.rows.map((row: any) => ({
      ...row,
      status: row.status === 'isolation' ? 'Admitted' : 'Discharged',
    }));
    return {
      metrics: {
        currently_admitted: entries.filter((entry: any) => entry.status === 'Admitted').length,
        discharged_today: entries.filter((entry: any) => entry.status === 'Discharged' && String(entry.admitted_at).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        avg_stay_hours: 0,
      },
      entries,
    };
  }

  async getParentNotifications() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          id::text,
          payload #>> '{student_name}' AS student_name,
          payload #>> '{parent_name}' AS parent_name,
          payload #>> '{parent_phone}' AS parent_phone,
          message,
          COALESCE(payload #>> '{channel}', 'in-app') AS channel,
          CASE WHEN status IN ('dispatched', 'handled') THEN 'Sent' ELSE 'Pending' END AS status,
          created_at::text AS sent_at
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'clinic.parent_notification'
        ORDER BY created_at DESC
      `,
      [tenantId]
    );
    return {
      metrics: {
        sent_today: res.rows.filter((row: any) => String(row.sent_at).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        pending: res.rows.filter((row: any) => row.status === 'Pending').length,
        failed: 0,
      },
      notifications: res.rows,
    };
  }

  async getHealthReports() {
    const tenantId = this.requireTenantId();
    return this.operations.listReportSnapshots(tenantId, 'nurse-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const [overview, visits, dispensingLog, medicineInventory, sickBayQueue, parentNotifications] = await Promise.all([
      this.getOverview(),
      this.getVisits(),
      this.getDispensingLog(),
      this.getMedicineInventory(),
      this.getSickBayQueue(),
      this.getParentNotifications(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'nurse-command',
      reportId: 'health-operations',
      title: String(dto?.name || dto?.title || 'Health operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, visits, dispensingLog, medicineInventory, sickBayQueue, parentNotifications },
      filters: { requested_from: 'nurse-dashboard' },
      targetRoles: ['principal', 'nurse', 'deputy_principal'],
    });
  }

  async createVisit(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const student = await this.resolveStudent(tenantId, dto.student_id, dto.student_name);
    const result = await this.operations.writeSql(
      `
        INSERT INTO clinic_visits (
          tenant_id, student_id, visit_date, symptoms_summary, diagnosis_summary,
          treatment_summary, confidential_notes, status, recorded_by_user_id
        )
        VALUES ($1, $2::uuid, CURRENT_DATE, $3, $4, $5, $6, 'open', $7::uuid)
        RETURNING *
      `,
      [
        tenantId,
        student.id,
        this.operations.requiredText(dto.complaint ?? dto.symptoms_summary ?? dto.symptoms, 'Complaint'),
        dto.diagnosis ?? dto.diagnosis_summary ?? null,
        dto.treatment ?? dto.treatment_summary ?? null,
        dto.notes ?? null,
        userId,
      ],
    );
    await this.operations.recordAudit(tenantId, 'clinic.visit.created', 'clinic_visit', result.rows[0]?.id ?? null, {
      student_id: student.id,
    }, userId);
    return result.rows[0];
  }

  async closeVisit(id: string) {
    return this.updateVisitStatus(id, 'completed', 'clinic.visit.closed');
  }

  async referVisit(id: string, dto: any) {
    const updated = await this.updateVisitStatus(id, 'referred', 'clinic.visit.referred', dto);
    await this.operations.notifyRoles(this.requireTenantId(), {
      key: `clinic-referral-${id}`,
      type: 'clinic.visit.referred',
      title: 'Student referred from clinic',
      body: String(dto?.reason ?? 'A clinic visit was referred for further attention.'),
      targetRoles: ['principal', 'deputy_principal', 'nurse'],
      metadata: { visit_id: id },
    });
    return updated;
  }

  async admitToSickBay(dto: any) {
    const tenantId = this.requireTenantId();
    const visit = await this.createVisit(dto);
    const result = await this.operations.writeSql(
      `UPDATE clinic_visits SET status = 'isolation', confidential_notes = COALESCE($3, confidential_notes), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, visit.id, dto.notes ?? null],
    );
    await this.operations.recordAudit(tenantId, 'clinic.sick_bay.admitted', 'clinic_visit', visit.id, {
      complaint: dto.complaint,
    }, this.requireUserId());
    return result.rows[0];
  }

  async dischargeFromSickBay(id: string) {
    return this.updateVisitStatus(id, 'completed', 'clinic.sick_bay.discharged');
  }

  async addMedicineStock(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const name = this.operations.requiredText(dto.medicine_name ?? dto.name, 'Medicine name');
    const category = this.operations.requiredText(dto.category ?? 'general', 'Category');
    const unit = this.normalizeMedicineUnit(dto.unit ?? dto.unit_type ?? 'tablets');
    const medicine = await this.operations.writeSql(
      `
        INSERT INTO clinic_medicines (
          tenant_id, medicine_name, category, unit_type, storage_location, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::uuid)
        ON CONFLICT (tenant_id, (lower(medicine_name)), (COALESCE(lower(brand_name), '')))
        DO UPDATE SET category = EXCLUDED.category, unit_type = EXCLUDED.unit_type, updated_at = NOW()
        RETURNING *
      `,
      [tenantId, name, category, unit, dto.storage_location ?? null, userId],
    );
    const medicineId = medicine.rows[0]?.id;
    const quantity = this.operations.positiveInteger(dto.quantity ?? dto.quantity_received, 'Quantity');
    const batch = await this.operations.writeSql(
      `
        INSERT INTO clinic_medicine_batches (
          tenant_id, medicine_id, batch_number, expiry_date, quantity_received,
          quantity_available, minimum_stock_threshold, storage_location, created_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4::date, $5, $5, $6, $7, $8::uuid)
        RETURNING *
      `,
      [
        tenantId,
        medicineId,
        dto.batch_number ?? `BATCH-${Date.now()}`,
        dto.expiry_date ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        quantity,
        Number(dto.reorder_level ?? dto.minimum_stock_threshold ?? 0),
        dto.storage_location ?? null,
        userId,
      ],
    );
    await this.recordStockMovement(medicineId, batch.rows[0]?.id, 'received', quantity, 0, quantity, 'Medicine stock received');
    return { medicine: medicine.rows[0], batch: batch.rows[0] };
  }

  async adjustMedicineStock(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const adjustment = Number(dto.adjustment ?? dto.quantity ?? 0);
    if (!Number.isFinite(adjustment) || adjustment === 0) {
      throw new BadRequestException('Stock adjustment cannot be zero');
    }
    const batchResult = await this.operations.writeSql(
      `
        SELECT id::text, medicine_id::text, quantity_available
        FROM clinic_medicine_batches
        WHERE tenant_id = $1 AND medicine_id = $2::uuid AND status IN ('active', 'near_expiry')
        ORDER BY expiry_date ASC
        LIMIT 1
        FOR UPDATE
      `,
      [tenantId, id],
    );
    const batch: any = batchResult.rows[0];
    if (!batch) throw new NotFoundException('Active medicine batch was not found');
    const before = Number(batch.quantity_available ?? 0);
    const after = before + adjustment;
    if (after < 0) throw new BadRequestException('Adjustment would make stock negative');
    await this.operations.writeSql(
      `
        UPDATE clinic_medicine_batches
        SET quantity_available = $3,
            quantity_received = CASE WHEN $3 > quantity_received THEN $3 ELSE quantity_received END,
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, batch.id, after],
    );
    await this.recordStockMovement(batch.medicine_id, batch.id, 'adjusted', Math.abs(adjustment), before, after, dto.reason ?? 'Manual adjustment');
    return { id: batch.id, medicine_id: batch.medicine_id, before, after };
  }

  async dispenseMedicine(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const student = await this.resolveStudent(tenantId, dto.student_id, dto.student_name);
    const medicineName = this.operations.requiredText(dto.medicine_name, 'Medicine name');
    const quantity = this.operations.positiveInteger(dto.quantity_given ?? dto.quantity_dispensed, 'Quantity');
    const batchResult = await this.operations.writeSql(
      `
        SELECT batch.id::text, batch.medicine_id::text, batch.quantity_available, medicine.medicine_name
        FROM clinic_medicine_batches batch
        INNER JOIN clinic_medicines medicine ON medicine.tenant_id = batch.tenant_id AND medicine.id = batch.medicine_id
        WHERE batch.tenant_id = $1
          AND medicine.is_active = TRUE
          AND medicine.medicine_name ILIKE $2
          AND batch.status IN ('active', 'near_expiry')
          AND batch.quantity_available >= $3
        ORDER BY batch.expiry_date ASC
        LIMIT 1
        FOR UPDATE
      `,
      [tenantId, medicineName, quantity],
    );
    const batch: any = batchResult.rows[0];
    if (!batch) throw new BadRequestException('Medicine stock is unavailable or insufficient');
    const visit = await this.operations.writeSql(
      `
        INSERT INTO clinic_visits (tenant_id, student_id, visit_date, symptoms_summary, treatment_summary, status, recorded_by_user_id)
        VALUES ($1, $2::uuid, CURRENT_DATE, 'Medicine dispensing', $3, 'completed', $4::uuid)
        RETURNING *
      `,
      [tenantId, student.id, dto.dosage ?? 'Dispensed medicine', userId],
    );
    const before = Number(batch.quantity_available);
    const after = before - quantity;
    await this.operations.writeSql(
      `UPDATE clinic_medicine_batches SET quantity_available = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid`,
      [tenantId, batch.id, after],
    );
    const dispense = await this.operations.writeSql(
      `
        INSERT INTO clinic_medicine_dispenses (
          tenant_id, visit_id, medicine_id, batch_id, quantity_dispensed, dosage, duration, instructions, dispensed_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9::uuid)
        RETURNING *
      `,
      [tenantId, visit.rows[0]?.id, batch.medicine_id, batch.id, quantity, dto.dosage ?? 'As directed', dto.duration ?? null, dto.instructions ?? null, userId],
    );
    await this.recordStockMovement(batch.medicine_id, batch.id, 'dispensed', quantity, before, after, `Dispensed to ${student.full_name}`);
    return dispense.rows[0];
  }

  async sendParentNotification(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const message = this.operations.requiredText(dto.message, 'Message');
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
          entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'nurse', $3::jsonb, 'clinic.parent_notification', 'clinic_parent_notification',
          gen_random_uuid(), 'Parent health notification', $4, 'high', $5::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        userId,
        JSON.stringify(['parent', 'principal']),
        message,
        JSON.stringify({
          student_name: dto.student_name,
          parent_name: dto.parent_name,
          parent_phone: dto.parent_phone,
          channel: dto.channel ?? 'sms',
        }),
      ],
    );
    await this.operations.recordAudit(tenantId, 'clinic.parent_notification.sent', 'workflow_event', result.rows[0]?.id ?? null, {
      student_name: dto.student_name,
      channel: dto.channel ?? 'sms',
    }, userId);
    return result.rows[0];
  }

  async resendParentNotification(id: string) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET status = 'dispatched', updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'clinic.parent_notification'
        RETURNING *
      `,
      [tenantId, id],
    );
    if (!result.rows[0]) throw new NotFoundException('Parent notification was not found');
    return result.rows[0];
  }

  private async updateVisitStatus(id: string, status: string, auditAction: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE clinic_visits
        SET status = $3,
            diagnosis_summary = COALESCE($4, diagnosis_summary),
            treatment_summary = COALESCE($5, treatment_summary),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, id, status, dto.diagnosis ?? null, dto.treatment ?? dto.reason ?? null],
    );
    if (!result.rows[0]) throw new NotFoundException('Clinic visit was not found');
    await this.operations.recordAudit(tenantId, auditAction, 'clinic_visit', id, { status }, userId);
    return result.rows[0];
  }

  private async resolveStudent(tenantId: string, studentId?: string, studentName?: string) {
    const params: any[] = [tenantId];
    let condition = '';
    if (studentId) {
      params.push(studentId);
      condition = 'student.id = $2::uuid';
    } else {
      const name = this.operations.requiredText(studentName, 'Student name');
      params.push(name);
      condition = `CONCAT(student.first_name, ' ', student.last_name) ILIKE $2`;
    }
    const result = await this.operations.readSql(
      `
        SELECT student.id::text, CONCAT(student.first_name, ' ', student.last_name) AS full_name
        FROM students student
        WHERE student.tenant_id = $1 AND ${condition}
        ORDER BY student.created_at DESC
        LIMIT 1
      `,
      params,
    );
    if (!result.rows[0]) throw new NotFoundException('Student was not found in this school');
    return result.rows[0] as any;
  }

  private async recordStockMovement(medicineId: string, batchId: string, movementType: string, quantity: number, before: number, after: number, reason: string) {
    const tenantId = this.requireTenantId();
    await this.operations.writeSql(
      `
        INSERT INTO clinic_stock_movements (
          tenant_id, medicine_id, batch_id, movement_type, quantity, before_quantity,
          after_quantity, reason, actor_user_id, metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9::uuid, '{}'::jsonb)
      `,
      [tenantId, medicineId, batchId, movementType, quantity, before, after, reason, this.requireUserId()],
    );
  }

  private formatVisitStatus(status: string) {
    if (status === 'completed') return 'Closed';
    if (status === 'referred') return 'Referred';
    if (status === 'isolation') return 'Open';
    return 'Open';
  }

  private stockStatus(quantity: number, reorderLevel: number, expiryDate?: string | null) {
    if (expiryDate && new Date(expiryDate) < new Date()) return 'Expired';
    if (quantity <= 0) return 'Out of Stock';
    if (quantity <= reorderLevel) return 'Low Stock';
    return 'In Stock';
  }

  private normalizeMedicineUnit(unit: unknown) {
    const normalized = String(unit || 'tablets').trim().toLowerCase();
    return ['tablets', 'bottles', 'sachets', 'injections', 'capsules', 'ml', 'grams', 'units'].includes(normalized)
      ? normalized
      : 'units';
  }
}
