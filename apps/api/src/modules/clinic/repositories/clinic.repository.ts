import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

export type ClinicBatchForDispensing = {
  id: string;
  medicine_id: string;
  medicine_name?: string;
  status: string;
  expiry_date: string;
  quantity_available: number | string;
  is_emergency_supply?: boolean;
};

export type ClinicLowStockBatch = {
  batch_id: string;
  medicine_id: string;
  medicine_name: string;
  batch_number: string;
  quantity_available: number | string;
  minimum_stock_threshold: number | string;
  shortage_quantity: number | string;
  recommended_order_quantity: number | string;
};

@Injectable()
export class ClinicRepository {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  async createMedicine(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO clinic_medicines (
          tenant_id, medicine_name, generic_name, brand_name, category, supplier,
          manufacturer, unit_type, storage_instructions, side_effect_notes, barcode,
          qr_code, storage_location, clinic_location_id, cost_price_minor,
          internal_value_minor, prescription_required, is_emergency_supply, created_by_user_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14::uuid, $15,
          $16, $17, $18, $19::uuid
        )
        RETURNING *
      `,
      [
        input.tenant_id,
        input.medicine_name,
        input.generic_name ?? null,
        input.brand_name ?? null,
        input.category,
        input.supplier ?? null,
        input.manufacturer ?? null,
        input.unit_type,
        input.storage_instructions ?? null,
        input.side_effect_notes ?? null,
        input.barcode ?? null,
        input.qr_code ?? null,
        input.storage_location ?? null,
        input.clinic_location_id ?? null,
        input.cost_price_minor ?? 0,
        input.internal_value_minor ?? 0,
        input.prescription_required ?? false,
        input.is_emergency_supply ?? false,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async listMedicines(
    tenantId: string,
    options: {
      search?: string;
      category?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const safeLimit = Math.min(Math.max(Math.floor(options.limit ?? 25), 1), 50);
    const safeOffset = Math.max(Math.floor(options.offset ?? 0), 0);
    const conditions = [
      'medicine.tenant_id = $1',
      'medicine.is_active = TRUE',
    ];
    const values: unknown[] = [tenantId];
    let parameterIndex = 2;

    if (options.search) {
      conditions.push(
        `(medicine.medicine_name ILIKE $${parameterIndex}
          OR medicine.generic_name ILIKE $${parameterIndex}
          OR medicine.brand_name ILIKE $${parameterIndex}
          OR medicine.barcode ILIKE $${parameterIndex})`,
      );
      values.push(`%${options.search}%`);
      parameterIndex += 1;
    }

    if (options.category) {
      conditions.push(`medicine.category = $${parameterIndex}`);
      values.push(options.category);
      parameterIndex += 1;
    }

    values.push(safeLimit, safeOffset);
    const result = await this.executeSql(
      `
        SELECT
          medicine.id::text,
          medicine.tenant_id,
          medicine.medicine_name,
          medicine.generic_name,
          medicine.brand_name,
          medicine.category,
          medicine.supplier,
          medicine.manufacturer,
          medicine.unit_type,
          medicine.storage_instructions,
          medicine.side_effect_notes,
          medicine.barcode,
          medicine.qr_code,
          medicine.storage_location,
          medicine.clinic_location_id::text,
          medicine.cost_price_minor,
          medicine.internal_value_minor,
          medicine.prescription_required,
          medicine.is_emergency_supply,
          medicine.is_active,
          medicine.created_by_user_id::text,
          medicine.created_at::text,
          medicine.updated_at::text,
          COALESCE(stock.quantity_in_stock, 0)::numeric AS quantity_in_stock,
          COALESCE(stock.batch_count, 0)::int AS batch_count,
          stock.nearest_expiry_date::text
        FROM clinic_medicines medicine
        LEFT JOIN (
          SELECT
            batch.tenant_id,
            batch.medicine_id,
            COALESCE(SUM(batch.quantity_available), 0)::numeric AS quantity_in_stock,
            COUNT(batch.id)::int AS batch_count,
            MIN(batch.expiry_date) FILTER (WHERE batch.status IN ('active', 'near_expiry')) AS nearest_expiry_date
          FROM clinic_medicine_batches batch
          WHERE batch.tenant_id = $1
          GROUP BY batch.tenant_id, batch.medicine_id
        ) stock
          ON stock.tenant_id = medicine.tenant_id
         AND stock.medicine_id = medicine.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY medicine.medicine_name ASC
        LIMIT $${parameterIndex}::integer
        OFFSET $${parameterIndex + 1}::integer
      `,
      values,
    );

    return result.rows;
  }

  async receiveMedicineStock(input: Record<string, unknown>) {
    return this.prisma.withRequestTransaction(async () => {
      const result = await this.executeSql(
        `
          INSERT INTO clinic_medicine_batches (
            tenant_id, medicine_id, batch_number, supplier_invoice_reference,
            procurement_reference, procurement_metadata, manufacturing_date,
            expiry_date, date_received, quantity_received, quantity_available,
            minimum_stock_threshold, storage_location, is_emergency_supply,
            created_by_user_id
          )
          SELECT
            $1,
            medicine.id,
            $3,
            $4,
            $5,
            $6::jsonb,
            $7::date,
            $8::date,
            COALESCE($9::date, CURRENT_DATE),
            $10,
            $10,
            $11,
            COALESCE($12, medicine.storage_location),
            medicine.is_emergency_supply,
            $13::uuid
          FROM clinic_medicines medicine
          WHERE medicine.tenant_id = $1
            AND medicine.id = $2::uuid
          RETURNING *
        `,
        [
          input.tenant_id,
          input.medicine_id,
          input.batch_number,
          input.supplier_invoice_reference ?? null,
          input.procurement_reference ?? null,
          JSON.stringify(input.procurement_metadata ?? {}),
          input.manufacturing_date ?? null,
          input.expiry_date,
          input.date_received ?? null,
          input.quantity_received,
          input.minimum_stock_threshold ?? 0,
          input.storage_location ?? null,
          input.actor_user_id,
        ],
      );
      const batch = result.rows[0];

      if (batch) {
        await this.insertStockMovement({
          tenant_id: input.tenant_id,
          medicine_id: input.medicine_id,
          batch_id: batch.id,
          movement_type: 'received',
          quantity: input.quantity_received,
          before_quantity: 0,
          after_quantity: input.quantity_received,
          reference: input.supplier_invoice_reference ?? input.procurement_reference ?? null,
          actor_user_id: input.actor_user_id,
          metadata: input.procurement_metadata ?? {},
        });
      }

      return batch;
    });
  }

  async createVisit(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO clinic_visits (
          tenant_id, student_id, clinic_location_id, visit_date, symptoms_summary,
          diagnosis_summary, confidential_notes, treatment_summary, status,
          recorded_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, COALESCE($4::date, CURRENT_DATE), $5, $6, $7, $8, $9, $10::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.student_id,
        input.clinic_location_id ?? null,
        input.visit_date ?? null,
        input.symptoms_summary ?? null,
        input.diagnosis_summary ?? null,
        input.confidential_notes ?? null,
        input.treatment_summary ?? null,
        input.status ?? 'open',
        input.recorded_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async findBatchForDispensing(
    tenantId: string,
    batchId: string,
  ): Promise<ClinicBatchForDispensing | null> {
    const result = await this.executeSql<ClinicBatchForDispensing>(
      `
        SELECT
          batch.id::text,
          batch.medicine_id::text,
          medicine.medicine_name,
          batch.status,
          batch.expiry_date::text,
          batch.quantity_available,
          batch.is_emergency_supply
        FROM clinic_medicine_batches batch
        INNER JOIN clinic_medicines medicine
          ON medicine.tenant_id = batch.tenant_id
         AND medicine.id = batch.medicine_id
        WHERE batch.tenant_id = $1
          AND batch.id = $2::uuid
        LIMIT 1
      `,
      [tenantId, batchId],
    );

    return result.rows[0] ?? null;
  }

  async dispenseMedicine(input: Record<string, unknown>) {
    return this.prisma.withRequestTransaction(async () => {
      const locked = await this.executeSql<ClinicBatchForDispensing>(
        `
          SELECT id::text, medicine_id::text, status, expiry_date::text, quantity_available
          FROM clinic_medicine_batches
          WHERE tenant_id = $1
            AND id = $2::uuid
          FOR UPDATE
        `,
        [input.tenant_id, input.batch_id],
      );
      const batch = locked.rows[0];

      if (!batch) {
        throw new Error('Medicine batch was not found');
      }

      const quantityAvailable = Number(batch.quantity_available ?? 0);
      const quantityDispensed = Number(input.quantity_dispensed ?? 0);

      if (quantityDispensed > quantityAvailable) {
        throw new Error('Insufficient medicine stock');
      }

      await this.executeSql(
        `
          UPDATE clinic_medicine_batches
          SET quantity_available = quantity_available - $3,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
        `,
        [input.tenant_id, input.batch_id, quantityDispensed],
      );

      const result = await this.executeSql(
        `
          INSERT INTO clinic_medicine_dispenses (
            tenant_id, visit_id, medicine_id, batch_id, quantity_dispensed,
            dosage, duration, instructions, dispensed_by_user_id
          )
          VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.visit_id,
          batch.medicine_id,
          input.batch_id,
          quantityDispensed,
          input.dosage,
          input.duration ?? null,
          input.instructions ?? null,
          input.dispensed_by_user_id,
        ],
      );

      await this.insertStockMovement({
        tenant_id: input.tenant_id,
        medicine_id: batch.medicine_id,
        batch_id: input.batch_id,
        visit_id: input.visit_id,
        movement_type: 'dispensed',
        quantity: quantityDispensed,
        before_quantity: quantityAvailable,
        after_quantity: quantityAvailable - quantityDispensed,
        actor_user_id: input.dispensed_by_user_id,
        metadata: { dosage: input.dosage, duration: input.duration ?? null },
      });

      return result.rows[0];
    });
  }

  async getPrincipalAnalytics(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          (SELECT COUNT(*)::int FROM clinic_medicines WHERE tenant_id = $1 AND is_active = TRUE) AS total_medicines,
          (SELECT COUNT(*)::int FROM clinic_medicine_batches WHERE tenant_id = $1 AND quantity_available <= minimum_stock_threshold AND status = 'active') AS low_stock_medicines,
          (SELECT COUNT(*)::int FROM clinic_medicine_batches WHERE tenant_id = $1 AND quantity_available <= 0 AND status = 'active') AS out_of_stock_medicines,
          (SELECT COUNT(*)::int FROM clinic_medicine_batches WHERE tenant_id = $1 AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' AND status IN ('active', 'near_expiry')) AS expiring_medicines,
          (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date = CURRENT_DATE) AS clinic_visits_today,
          (SELECT COALESCE(SUM(quantity_dispensed), 0)::numeric FROM clinic_medicine_dispenses WHERE tenant_id = $1 AND dispensed_at >= date_trunc('month', NOW())) AS medicine_units_dispensed_month,
          COALESCE((
            SELECT SUM(dispense.quantity_dispensed * medicine.cost_price_minor)
            FROM clinic_medicine_dispenses dispense
            INNER JOIN clinic_medicines medicine
              ON medicine.tenant_id = dispense.tenant_id
             AND medicine.id = dispense.medicine_id
            WHERE dispense.tenant_id = $1
              AND dispense.dispensed_at >= date_trunc('month', NOW())
          ), 0)::numeric AS medicine_consumption_cost_minor,
          COALESCE((
            SELECT SUM(batch.quantity_available * medicine.cost_price_minor)
            FROM clinic_medicine_batches batch
            INNER JOIN clinic_medicines medicine
              ON medicine.tenant_id = batch.tenant_id
             AND medicine.id = batch.medicine_id
            WHERE batch.tenant_id = $1
              AND batch.status = 'expired'
          ), 0)::numeric AS wastage_due_to_expiry_minor,
          COALESCE((
            SELECT ROUND(
              100.0 * COUNT(*) FILTER (WHERE quantity_available > 0 AND status IN ('active', 'near_expiry'))
              / NULLIF(COUNT(*), 0),
              2
            )
            FROM clinic_medicine_batches
            WHERE tenant_id = $1
              AND is_emergency_supply = TRUE
          ), 100)::numeric AS emergency_supply_ready_rate,
          COALESCE((
            SELECT medicine.medicine_name
            FROM clinic_medicine_dispenses dispense
            INNER JOIN clinic_medicines medicine
              ON medicine.tenant_id = dispense.tenant_id
             AND medicine.id = dispense.medicine_id
            WHERE dispense.tenant_id = $1
              AND dispense.dispensed_at >= date_trunc('month', NOW())
            GROUP BY medicine.medicine_name
            ORDER BY SUM(dispense.quantity_dispensed) DESC, medicine.medicine_name ASC
            LIMIT 1
          ), 'None') AS most_used_medicine,
          (SELECT COUNT(*)::int FROM clinic_alerts WHERE tenant_id = $1 AND status = 'open' AND severity = 'critical') AS critical_alerts
      `,
      [tenantId],
    );

    return result.rows[0] ?? {};
  }

  async listLowStockBatches(tenantId: string): Promise<ClinicLowStockBatch[]> {
    const result = await this.executeSql<ClinicLowStockBatch>(
      `
        SELECT
          batch.id::text AS batch_id,
          batch.medicine_id::text,
          medicine.medicine_name,
          batch.batch_number,
          batch.quantity_available,
          batch.minimum_stock_threshold,
          GREATEST(batch.minimum_stock_threshold - batch.quantity_available, 0)::numeric AS shortage_quantity,
          GREATEST((batch.minimum_stock_threshold - batch.quantity_available) * 2, batch.minimum_stock_threshold)::numeric AS recommended_order_quantity
        FROM clinic_medicine_batches batch
        INNER JOIN clinic_medicines medicine
          ON medicine.tenant_id = batch.tenant_id
         AND medicine.id = batch.medicine_id
        WHERE batch.tenant_id = $1
          AND batch.status IN ('active', 'near_expiry')
          AND batch.quantity_available <= batch.minimum_stock_threshold
        ORDER BY medicine.medicine_name ASC, batch.expiry_date ASC
      `,
      [tenantId],
    );

    return result.rows;
  }

  async createProcurementRecommendation(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO clinic_procurement_recommendations (
          tenant_id, module_code, medicine_id, batch_id, item_name, batch_number,
          quantity_available, minimum_stock_threshold, shortage_quantity,
          recommended_order_quantity, metadata
        )
        SELECT
          $1,
          $2,
          $3::uuid,
          $4::uuid,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::jsonb
        WHERE NOT EXISTS (
          SELECT 1
          FROM clinic_procurement_recommendations existing
          WHERE existing.tenant_id = $1
            AND existing.batch_id = $4::uuid
            AND existing.recommendation_status = 'open'
        )
        RETURNING *
      `,
      [
        input.tenant_id,
        input.module_code ?? 'clinic_health',
        input.medicine_id,
        input.batch_id ?? null,
        input.item_name,
        input.batch_number ?? null,
        input.quantity_available ?? 0,
        input.minimum_stock_threshold ?? 0,
        input.shortage_quantity ?? 0,
        input.recommended_order_quantity ?? 0,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return result.rows[0] ?? null;
  }

  async isGuardianLinkedToStudent(
    tenantId: string,
    guardianUserId: string,
    studentId: string,
  ): Promise<boolean> {
    const result = await this.executeSql<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM student_guardians
          WHERE tenant_id = $1
            AND student_id = $2::uuid
            AND user_id = $3::uuid
            AND status = 'active'
        ) AS exists
      `,
      [tenantId, studentId, guardianUserId],
    );

    return Boolean(result.rows[0]?.exists);
  }

  async listParentMedicalHistory(tenantId: string, studentId: string) {
    const result = await this.executeSql(
      `
        SELECT
          visit.id::text,
          visit.visit_date::text,
          visit.symptoms_summary,
          visit.diagnosis_summary,
          visit.treatment_summary,
          visit.status,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'medicine_name', medicine.medicine_name,
                'dosage', dispense.dosage,
                'duration', dispense.duration,
                'instructions', dispense.instructions,
                'quantity_dispensed', dispense.quantity_dispensed
              )
              ORDER BY dispense.dispensed_at DESC
            ) FILTER (WHERE dispense.id IS NOT NULL),
            '[]'::jsonb
          ) AS medicines_dispensed
        FROM clinic_visits visit
        LEFT JOIN clinic_medicine_dispenses dispense
          ON dispense.tenant_id = visit.tenant_id
         AND dispense.visit_id = visit.id
        LEFT JOIN clinic_medicines medicine
          ON medicine.tenant_id = dispense.tenant_id
         AND medicine.id = dispense.medicine_id
        WHERE visit.tenant_id = $1
          AND visit.student_id = $2::uuid
        GROUP BY visit.id
        ORDER BY visit.visit_date DESC, visit.visit_time DESC
        LIMIT 50
      `,
      [tenantId, studentId],
    );

    return result.rows;
  }

  async markExpiryStatuses(tenantId: string) {
    await this.executeSql(
      `
        UPDATE clinic_medicine_batches
        SET status = CASE
              WHEN expiry_date < CURRENT_DATE THEN 'expired'
              WHEN expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'near_expiry'
              ELSE status
            END,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND status IN ('active', 'near_expiry')
      `,
      [tenantId],
    );
  }

  async createExpiryAlerts(tenantId: string) {
    const result = await this.executeSql(
      `
        INSERT INTO clinic_alerts (
          tenant_id, alert_type, severity, medicine_id, batch_id, title, message,
          notify_principal, metadata
        )
        SELECT
          batch.tenant_id,
          'expiry',
          CASE WHEN batch.expiry_date < CURRENT_DATE THEN 'critical' ELSE 'warning' END,
          batch.medicine_id,
          batch.id,
          'Medicine expiry alert',
          medicine.medicine_name || ' batch ' || batch.batch_number || ' expires on ' || batch.expiry_date::text,
          TRUE,
          jsonb_build_object('expiry_date', batch.expiry_date, 'batch_number', batch.batch_number)
        FROM clinic_medicine_batches batch
        INNER JOIN clinic_medicines medicine
          ON medicine.tenant_id = batch.tenant_id
         AND medicine.id = batch.medicine_id
        WHERE batch.tenant_id = $1
          AND batch.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
          AND batch.status IN ('active', 'near_expiry', 'expired')
          AND NOT EXISTS (
            SELECT 1
            FROM clinic_alerts existing
            WHERE existing.tenant_id = batch.tenant_id
              AND existing.batch_id = batch.id
              AND existing.alert_type = 'expiry'
              AND existing.status = 'open'
          )
        RETURNING *
      `,
      [tenantId],
    );

    return result.rows;
  }

  async createLowStockAlerts(tenantId: string) {
    const result = await this.executeSql(
      `
        INSERT INTO clinic_alerts (
          tenant_id, alert_type, severity, medicine_id, batch_id, title, message,
          notify_principal, metadata
        )
        SELECT
          batch.tenant_id,
          CASE WHEN batch.quantity_available <= 0 THEN 'out_of_stock' ELSE 'low_stock' END,
          CASE WHEN batch.quantity_available <= 0 THEN 'critical' ELSE 'warning' END,
          batch.medicine_id,
          batch.id,
          'Medicine stock alert',
          medicine.medicine_name || ' batch ' || batch.batch_number || ' has ' || batch.quantity_available::text || ' units left',
          TRUE,
          jsonb_build_object('quantity_available', batch.quantity_available, 'minimum_stock_threshold', batch.minimum_stock_threshold)
        FROM clinic_medicine_batches batch
        INNER JOIN clinic_medicines medicine
          ON medicine.tenant_id = batch.tenant_id
         AND medicine.id = batch.medicine_id
        WHERE batch.tenant_id = $1
          AND batch.status IN ('active', 'near_expiry')
          AND batch.quantity_available <= batch.minimum_stock_threshold
          AND NOT EXISTS (
            SELECT 1
            FROM clinic_alerts existing
            WHERE existing.tenant_id = batch.tenant_id
              AND existing.batch_id = batch.id
              AND existing.alert_type IN ('low_stock', 'out_of_stock')
              AND existing.status = 'open'
          )
        RETURNING *
      `,
      [tenantId],
    );

    return result.rows;
  }

  async appendAuditLog(input: Record<string, unknown>) {
    await this.executeSql(
      `
        INSERT INTO clinic_audit_logs (
          tenant_id, actor_user_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, $2::uuid, $3, $4, $5::uuid, $6::jsonb)
      `,
      [
        input.tenant_id,
        input.actor_user_id ?? null,
        input.action,
        input.resource_type,
        input.resource_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    ).catch(() => undefined);
  }

  private async insertStockMovement(input: Record<string, unknown>) {
    await this.executeSql(
      `
        INSERT INTO clinic_stock_movements (
          tenant_id, medicine_id, batch_id, visit_id, movement_type, quantity,
          before_quantity, after_quantity, reference, reason, actor_user_id, metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10, $11::uuid, $12::jsonb)
      `,
      [
        input.tenant_id,
        input.medicine_id,
        input.batch_id ?? null,
        input.visit_id ?? null,
        input.movement_type,
        input.quantity,
        input.before_quantity ?? null,
        input.after_quantity ?? null,
        input.reference ?? null,
        input.reason ?? null,
        input.actor_user_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
