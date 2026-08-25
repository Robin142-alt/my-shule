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
    return this.prisma.query<T>(query, params);
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
    const [notificationResult, recipientResult] = await Promise.all([
      this.executeSql(
        `
        SELECT
          notification.id::text,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), ''),
            student.admission_number,
            'Learner'
          ) AS student_name,
          guardian.display_name AS parent_name,
          CASE
            WHEN NULLIF(TRIM(COALESCE(guardian.phone, '')), '') IS NULL THEN 'Not available'
            ELSE CONCAT('***', RIGHT(TRIM(guardian.phone), 4))
          END AS parent_phone,
          notification.body AS message,
          CASE
            WHEN COALESCE(notification.metadata #>> '{channel}', 'in-app') = 'sms' THEN 'sms + in-app'
            ELSE 'in-app'
          END AS channel,
          CASE
            WHEN LOWER(notification.status) = 'failed' THEN 'Failed'
            WHEN COALESCE(notification.metadata #>> '{channel}', 'in-app') = 'sms' THEN 'Queued'
            ELSE 'Sent'
          END AS status,
          notification.created_at::text AS queued_at
        FROM notifications notification
        INNER JOIN student_guardians guardian
          ON guardian.tenant_id = notification.tenant_id
         AND guardian.id = notification.recipient_guardian_id
         AND guardian.user_id = notification.recipient_user_id
        INNER JOIN students student
          ON student.tenant_id = notification.tenant_id
         AND student.id::text = notification.metadata #>> '{student_id}'
        WHERE notification.tenant_id = $1
          AND notification.type = 'clinic.parent_notification'
          AND notification.source_module = 'nurse-command'
          AND notification.recipient_user_id IS NOT NULL
          AND notification.recipient_guardian_id IS NOT NULL
        ORDER BY notification.created_at DESC
        `,
        [tenantId],
      ),
      this.executeSql<{
        student_id: string;
        student_name: string;
        guardian_id: string;
        guardian_name: string;
        relationship: string;
        sms_available: boolean;
      }>(
        `
          SELECT DISTINCT
            student.id::text AS student_id,
            COALESCE(
              NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), ''),
              student.admission_number,
              'Learner'
            ) AS student_name,
            guardian.id::text AS guardian_id,
            guardian.display_name AS guardian_name,
            guardian.relationship,
            COALESCE(guardian.can_receive_sms, TRUE)
              AND NULLIF(TRIM(COALESCE(guardian.phone, '')), '') IS NOT NULL AS sms_available
          FROM students student
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = student.tenant_id
           AND guardian.student_id::text = student.id::text
           AND LOWER(guardian.status) = 'active'
           AND guardian.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
          WHERE student.tenant_id = $1
            AND student.deleted_at IS NULL
            AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
          ORDER BY student_name, guardian_name
        `,
        [tenantId],
      ),
    ]);
    const notifications = notificationResult.rows as any[];
    return {
      metrics: {
        queued_today: notifications.filter((row: any) => String(row.queued_at).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        pending: notifications.filter((row: any) => row.status === 'Queued').length,
        failed: notifications.filter((row: any) => row.status === 'Failed').length,
      },
      notifications,
      recipients: recipientResult.rows,
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
    const studentId = this.operations.requiredText(dto?.student_id, 'Student');
    const guardianId = dto?.guardian_id == null || String(dto.guardian_id).trim() === ''
      ? null
      : String(dto.guardian_id).trim();
    const message = this.operations.requiredText(dto.message, 'Message');
    if (message.length > 1600) {
      throw new BadRequestException('Message must be 1600 characters or fewer');
    }
    const channel = String(dto?.channel ?? 'in-app').trim().toLowerCase();
    if (channel !== 'sms' && channel !== 'in-app') {
      throw new BadRequestException('Channel must be SMS or in-app');
    }

    const result = await this.operations.writeSql<{
      student_count: number;
      guardian_count: number;
      sms_eligible_count: number;
      portal_notification_count: number;
      sms_queue_count: number;
      sms_processing_count: number;
      sms_accepted_count: number;
      sms_needs_review_count: number;
      sms_outbox_count: number;
      event_id: string | null;
    }>(
      `
        WITH selected_student AS (
          SELECT student.id::text AS student_id
          FROM students student
          WHERE student.tenant_id = $1
            AND student.id::text = $3
            AND student.deleted_at IS NULL
            AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
        ), guardian_recipients AS (
          SELECT DISTINCT ON (guardian.user_id)
            guardian.id AS guardian_id,
            guardian.user_id,
            NULLIF(TRIM(COALESCE(guardian.phone, '')), '') AS phone,
            COALESCE(guardian.can_receive_sms, TRUE) AS can_receive_sms
          FROM selected_student student
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id::text = student.student_id
           AND LOWER(guardian.status) = 'active'
           AND guardian.user_id IS NOT NULL
           AND ($4::text IS NULL OR guardian.id::text = $4)
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
          ORDER BY guardian.user_id, guardian.is_primary DESC, guardian.created_at ASC
        ), delivery AS (
          SELECT
            (SELECT COUNT(*)::int FROM selected_student) AS student_count,
            (SELECT COUNT(*)::int FROM guardian_recipients) AS guardian_count,
            (
              SELECT COUNT(*)::int
              FROM guardian_recipients recipient
              WHERE recipient.can_receive_sms = TRUE
                AND recipient.phone IS NOT NULL
            ) AS sms_eligible_count
        ), batch AS (
          SELECT gen_random_uuid() AS id
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
            entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $2::uuid,
            'nurse',
            '["nurse","principal","deputy_principal"]'::jsonb,
            'clinic.parent_notification',
            'clinic_parent_notification',
            batch.id::text,
            'Guardian health alert queued',
            delivery.guardian_count::text || ' exact linked guardian delivery record(s) queued by the clinic.',
            'high',
            jsonb_build_object(
              'channel', $5::text,
              'recipient_scope', 'exact_linked_guardian_users',
              'recipient_count', delivery.guardian_count,
              'source_dashboard', 'nurse-parent-notifications'
            )
          FROM delivery
          CROSS JOIN batch
          WHERE delivery.student_count = 1
            AND delivery.guardian_count > 0
            AND ($5 <> 'sms' OR delivery.sms_eligible_count = delivery.guardian_count)
          RETURNING id
        ), inserted_guardian_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'nurse-parent-notification-' || event.id::text || '-' || recipient.guardian_id::text,
            recipient.user_id,
            recipient.guardian_id,
            'clinic.parent_notification',
            'School clinic health alert',
            $6,
            'unread',
            'high',
            'nurse-command',
            event.id::text,
            jsonb_build_object(
              'event_id', event.id::text,
              'student_id', $3::text,
              'channel', $5::text,
              'recipient_scope', 'exact_linked_guardian_user',
              'source_dashboard', 'nurse-parent-notifications'
            )
          FROM inserted_event event
          CROSS JOIN guardian_recipients recipient
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_guardian_id = EXCLUDED.recipient_guardian_id,
            body = EXCLUDED.body,
            status = 'unread',
            priority = EXCLUDED.priority,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), inserted_sms AS (
          INSERT INTO communication_sms_outbox (
            tenant_id, sent_by, recipient_phone, message, status, dispatch_key
          )
          SELECT
            $1,
            $2::uuid,
            recipient.phone,
            $6,
            'Pending',
            'nurse-parent-notification:'
              || NULLIF(current_setting('app.request_id', true), '')
              || ':' || recipient.guardian_id::text
          FROM inserted_event event
          CROSS JOIN guardian_recipients recipient
          WHERE $5 = 'sms'
            AND recipient.can_receive_sms = TRUE
            AND recipient.phone IS NOT NULL
          ON CONFLICT (tenant_id, dispatch_key) DO UPDATE
          SET dispatch_key = EXCLUDED.dispatch_key
          WHERE communication_sms_outbox.recipient_phone = EXCLUDED.recipient_phone
            AND communication_sms_outbox.message = EXCLUDED.message
            AND communication_sms_outbox.sent_by IS NOT DISTINCT FROM EXCLUDED.sent_by
          RETURNING id, status
        ), sms_outcome AS (
          SELECT
            COUNT(*)::int AS outbox_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'queued')))::int AS queued_count,
            (COUNT(*) FILTER (WHERE LOWER(status) = 'processing'))::int AS processing_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('accepted', 'sent', 'provider_accepted')))::int AS accepted_count,
            (COUNT(*) FILTER (WHERE LOWER(status) NOT IN (
              'pending', 'queued', 'processing', 'accepted', 'sent', 'provider_accepted'
            )))::int AS needs_review_count
          FROM inserted_sms
        ), action_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $2::uuid,
            current_setting('app.request_id', true),
            'clinic.parent_notification.sent',
            'clinic_parent_notification',
            event.id,
            jsonb_build_object(
              'channel', $5::text,
              'recipient_scope', 'exact_linked_guardian_users',
              'guardian_count', delivery.guardian_count,
              'portal_notification_count', (SELECT COUNT(*) FROM inserted_guardian_notifications),
              'sms_queue_count', (SELECT queued_count FROM sms_outcome),
              'sms_processing_count', (SELECT processing_count FROM sms_outcome),
              'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
              'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome)
            )
          FROM inserted_event event
          CROSS JOIN delivery
          RETURNING id
        )
        SELECT
          delivery.student_count,
          delivery.guardian_count,
          delivery.sms_eligible_count,
          (SELECT COUNT(*)::int FROM inserted_guardian_notifications) AS portal_notification_count,
          (SELECT queued_count FROM sms_outcome) AS sms_queue_count,
          (SELECT processing_count FROM sms_outcome) AS sms_processing_count,
          (SELECT accepted_count FROM sms_outcome) AS sms_accepted_count,
          (SELECT needs_review_count FROM sms_outcome) AS sms_needs_review_count,
          (SELECT outbox_count FROM sms_outcome) AS sms_outbox_count,
          (SELECT id::text FROM inserted_event LIMIT 1) AS event_id
        FROM delivery
      `,
      [tenantId, userId, studentId, guardianId, channel, message],
    );
    const delivery = result.rows[0];
    if (!delivery || Number(delivery.student_count) !== 1) {
      throw new BadRequestException('The selected learner is not an active learner in this school');
    }
    const guardianCount = Number(delivery.guardian_count ?? 0);
    if (guardianCount === 0) {
      throw new BadRequestException('The selected learner has no active linked guardian account');
    }
    if (channel === 'sms' && Number(delivery.sms_eligible_count ?? 0) !== guardianCount) {
      throw new BadRequestException('Every selected guardian must have an active SMS-enabled phone number');
    }
    const portalNotificationCount = Number(delivery.portal_notification_count ?? 0);
    const smsQueueCount = Number(delivery.sms_queue_count ?? 0);
    const smsProcessingCount = Number(delivery.sms_processing_count ?? 0);
    const smsAcceptedCount = Number(delivery.sms_accepted_count ?? 0);
    const smsNeedsReviewCount = Number(delivery.sms_needs_review_count ?? 0);
    const smsOutboxCount = Number(
      delivery.sms_outbox_count
        ?? smsQueueCount + smsProcessingCount + smsAcceptedCount + smsNeedsReviewCount,
    );
    if (!delivery.event_id || portalNotificationCount !== guardianCount || (channel === 'sms' && smsOutboxCount !== guardianCount)) {
      throw new BadRequestException('The guardian health alert could not be queued completely');
    }
    return {
      success: true,
      message: `Health alert recorded for ${guardianCount} exact guardian account${guardianCount === 1 ? '' : 's'} (${portalNotificationCount} portal${channel === 'sms' ? `; SMS: ${smsQueueCount} queued, ${smsProcessingCount} dispatching, ${smsAcceptedCount} provider-accepted, ${smsNeedsReviewCount} requiring review` : ''}).`,
      delivery: {
        event_id: delivery.event_id,
        guardian_count: guardianCount,
        portal_notification_count: portalNotificationCount,
        sms_queue_count: smsQueueCount,
        sms_processing_count: smsProcessingCount,
        sms_accepted_count: smsAcceptedCount,
        sms_needs_review_count: smsNeedsReviewCount,
        sms_outbox_count: smsOutboxCount,
        recipient_scope: 'exact_linked_guardian_users',
      },
    };
  }

  async resendParentNotification(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const notificationId = this.operations.requiredText(id, 'Notification');
    const result = await this.operations.writeSql<{
      notification_id: string;
      channel: string;
      portal_notification_count: number;
      sms_queue_count: number;
      sms_processing_count: number;
      sms_accepted_count: number;
      sms_needs_review_count: number;
      sms_outbox_count: number;
      event_id: string;
    }>(
      `
        WITH exact_original AS (
          SELECT DISTINCT ON (notification.id)
            notification.id,
            notification.recipient_user_id,
            notification.recipient_guardian_id,
            notification.body,
            COALESCE(notification.metadata #>> '{channel}', 'in-app') AS channel,
            notification.metadata #>> '{student_id}' AS student_id,
            NULLIF(TRIM(COALESCE(guardian.phone, '')), '') AS phone,
            COALESCE(guardian.can_receive_sms, TRUE) AS can_receive_sms
          FROM notifications notification
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = notification.tenant_id
           AND guardian.id = notification.recipient_guardian_id
           AND guardian.user_id = notification.recipient_user_id
           AND LOWER(guardian.status) = 'active'
          INNER JOIN students student
            ON student.tenant_id = notification.tenant_id
           AND student.id::text = notification.metadata #>> '{student_id}'
           AND student.id::text = guardian.student_id::text
           AND student.deleted_at IS NULL
           AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
          WHERE notification.tenant_id = $1
            AND notification.id::text = $3
            AND notification.type = 'clinic.parent_notification'
            AND notification.source_module = 'nurse-command'
            AND notification.recipient_user_id IS NOT NULL
            AND notification.recipient_guardian_id IS NOT NULL
          ORDER BY notification.id
        ), eligible_original AS (
          SELECT *
          FROM exact_original
          WHERE channel IN ('in-app', 'sms')
            AND (
              channel <> 'sms'
              OR (can_receive_sms = TRUE AND phone IS NOT NULL)
            )
        ), batch AS (
          SELECT gen_random_uuid() AS id
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
            entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $2::uuid,
            'nurse',
            '["nurse","principal","deputy_principal"]'::jsonb,
            'clinic.parent_notification.resent',
            'clinic_parent_notification',
            batch.id::text,
            'Guardian health alert requeued',
            'One exact linked guardian delivery record was requeued by the clinic.',
            'high',
            jsonb_build_object(
              'channel', original.channel,
              'recipient_scope', 'exact_linked_guardian_user',
              'recipient_count', 1,
              'source_dashboard', 'nurse-parent-notifications'
            )
          FROM eligible_original original
          CROSS JOIN batch
          RETURNING id
        ), updated_notification AS (
          UPDATE notifications notification
          SET status = 'unread',
              metadata = notification.metadata
                || jsonb_build_object(
                  'last_resent_at', NOW(),
                  'resend_count',
                    CASE
                      WHEN COALESCE(notification.metadata #>> '{resend_count}', '') ~ '^[0-9]+$'
                        THEN (notification.metadata #>> '{resend_count}')::int + 1
                      ELSE 1
                    END
                ),
              updated_at = NOW()
          FROM eligible_original original
          CROSS JOIN inserted_event event
          WHERE notification.tenant_id = $1
            AND notification.id = original.id
          RETURNING notification.id
        ), inserted_sms AS (
          INSERT INTO communication_sms_outbox (
            tenant_id, sent_by, recipient_phone, message, status, dispatch_key
          )
          SELECT
            $1,
            $2::uuid,
            original.phone,
            original.body,
            'Pending',
            'nurse-parent-notification-resend:'
              || NULLIF(current_setting('app.request_id', true), '')
              || ':' || original.id::text
          FROM eligible_original original
          CROSS JOIN inserted_event event
          WHERE original.channel = 'sms'
          ON CONFLICT (tenant_id, dispatch_key) DO UPDATE
          SET dispatch_key = EXCLUDED.dispatch_key
          WHERE communication_sms_outbox.recipient_phone = EXCLUDED.recipient_phone
            AND communication_sms_outbox.message = EXCLUDED.message
            AND communication_sms_outbox.sent_by IS NOT DISTINCT FROM EXCLUDED.sent_by
          RETURNING id, status
        ), sms_outcome AS (
          SELECT
            COUNT(*)::int AS outbox_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'queued')))::int AS queued_count,
            (COUNT(*) FILTER (WHERE LOWER(status) = 'processing'))::int AS processing_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('accepted', 'sent', 'provider_accepted')))::int AS accepted_count,
            (COUNT(*) FILTER (WHERE LOWER(status) NOT IN (
              'pending', 'queued', 'processing', 'accepted', 'sent', 'provider_accepted'
            )))::int AS needs_review_count
          FROM inserted_sms
        ), action_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $2::uuid,
            current_setting('app.request_id', true),
            'clinic.parent_notification.resent',
            'clinic_parent_notification',
            event.id,
            jsonb_build_object(
              'channel', original.channel,
              'recipient_scope', 'exact_linked_guardian_user',
              'portal_notification_count', (SELECT COUNT(*) FROM updated_notification),
              'sms_queue_count', (SELECT queued_count FROM sms_outcome),
              'sms_processing_count', (SELECT processing_count FROM sms_outcome),
              'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
              'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome)
            )
          FROM eligible_original original
          CROSS JOIN inserted_event event
          RETURNING id
        )
        SELECT
          original.id::text AS notification_id,
          original.channel,
          (SELECT COUNT(*)::int FROM updated_notification) AS portal_notification_count,
          (SELECT queued_count FROM sms_outcome) AS sms_queue_count,
          (SELECT processing_count FROM sms_outcome) AS sms_processing_count,
          (SELECT accepted_count FROM sms_outcome) AS sms_accepted_count,
          (SELECT needs_review_count FROM sms_outcome) AS sms_needs_review_count,
          (SELECT outbox_count FROM sms_outcome) AS sms_outbox_count,
          event.id::text AS event_id
        FROM eligible_original original
        CROSS JOIN inserted_event event
      `,
      [tenantId, userId, notificationId],
    );
    const delivery = result.rows[0];
    if (!delivery) throw new NotFoundException('An active exact guardian notification was not found');
    const portalNotificationCount = Number(delivery.portal_notification_count ?? 0);
    const smsQueueCount = Number(delivery.sms_queue_count ?? 0);
    const smsProcessingCount = Number(delivery.sms_processing_count ?? 0);
    const smsAcceptedCount = Number(delivery.sms_accepted_count ?? 0);
    const smsNeedsReviewCount = Number(delivery.sms_needs_review_count ?? 0);
    const smsOutboxCount = Number(
      delivery.sms_outbox_count
        ?? smsQueueCount + smsProcessingCount + smsAcceptedCount + smsNeedsReviewCount,
    );
    if (portalNotificationCount !== 1 || (delivery.channel === 'sms' && smsOutboxCount !== 1)) {
      throw new BadRequestException('The guardian health alert could not be requeued completely');
    }
    return {
      success: true,
      message: `Health alert portal record refreshed for the exact guardian (${portalNotificationCount} portal${delivery.channel === 'sms' ? `; SMS: ${smsQueueCount} queued, ${smsProcessingCount} dispatching, ${smsAcceptedCount} provider-accepted, ${smsNeedsReviewCount} requiring review` : ''}).`,
      delivery: {
        event_id: delivery.event_id,
        notification_id: delivery.notification_id,
        portal_notification_count: portalNotificationCount,
        sms_queue_count: smsQueueCount,
        sms_processing_count: smsProcessingCount,
        sms_accepted_count: smsAcceptedCount,
        sms_needs_review_count: smsNeedsReviewCount,
        sms_outbox_count: smsOutboxCount,
        recipient_scope: 'exact_linked_guardian_user',
      },
    };
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
