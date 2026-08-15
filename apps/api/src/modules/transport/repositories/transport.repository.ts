import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

export interface TransportDashboardSummary {
  active_routes: number;
  active_vehicles: number;
  active_manifests: number;
  trips_today: number;
  open_alerts: number;
  service_due_vehicles: number;
}

export interface TransportManifestReferenceCheck {
  route_exists: boolean;
  academic_term_exists: boolean;
  student_count: number;
}

@Injectable()
export class TransportRepository {

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

  async listVehicles(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          vehicle.id::text,
          concat_ws(
            ' ',
            NULLIF(concat_ws(' ', vehicle.make, vehicle.model), ''),
            '(' || vehicle.registration_number || ')'
          ) AS vehicle,
          COALESCE(latest_assignment.route_name, 'Unassigned') AS route,
          COALESCE(latest_assignment.driver_name, 'Unassigned') AS driver,
          CASE
            WHEN vehicle.status = 'active' THEN 'Active'
            WHEN vehicle.status = 'maintenance' THEN 'Maintenance'
            ELSE 'Offline'
          END AS status,
          0::int AS "fuelLevel",
          FALSE AS "fuelLevelAvailable",
          CASE
            WHEN vehicle.service_due_date <= CURRENT_DATE
              THEN 'Service overdue since ' || vehicle.service_due_date::text
            WHEN vehicle.service_due_date IS NOT NULL
              THEN 'Next service ' || vehicle.service_due_date::text
            ELSE ''
          END AS "maintenanceNote"
        FROM transport_vehicles vehicle
        LEFT JOIN LATERAL (
          SELECT
            route.name AS route_name,
            driver.name AS driver_name
          FROM transport_trips trip
          INNER JOIN transport_routes route
            ON route.tenant_id = trip.tenant_id
           AND route.id = trip.route_id
          LEFT JOIN transport_drivers driver
            ON driver.tenant_id = trip.tenant_id
           AND driver.id = trip.driver_id
          WHERE trip.tenant_id = vehicle.tenant_id
            AND trip.vehicle_id = vehicle.id
          ORDER BY trip.trip_date DESC, trip.created_at DESC
          LIMIT 1
        ) latest_assignment ON TRUE
        WHERE vehicle.tenant_id = $1
        ORDER BY vehicle.registration_number ASC
      `,
      [tenantId],
    );

    return result.rows;
  }

  async listTrips(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          manifest_student.id::text,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student,
          student.admission_number AS "admissionNo",
          route.name AS route,
          COALESCE(stop.name, 'Stop not assigned') AS stop,
          CASE latest_event.event_type
            WHEN 'pickup' THEN 'Picked'
            WHEN 'dropoff' THEN 'Dropped'
            WHEN 'incident' THEN 'Not Picked'
            ELSE 'Waiting'
          END AS status,
          FALSE AS "parentAlertSent",
          CASE
            WHEN latest_event.event_time IS NULL THEN ''
            ELSE to_char(latest_event.event_time AT TIME ZONE 'Africa/Nairobi', 'HH24:MI')
          END AS time
        FROM transport_manifest_students manifest_student
        INNER JOIN transport_manifests manifest
          ON manifest.tenant_id = manifest_student.tenant_id
         AND manifest.id = manifest_student.manifest_id
         AND manifest.status = 'active'
        INNER JOIN transport_routes route
          ON route.tenant_id = manifest.tenant_id
         AND route.id = manifest.route_id
        INNER JOIN students student
          ON student.tenant_id = manifest_student.tenant_id
         AND student.id::text = manifest_student.student_id::text
        LEFT JOIN transport_route_stops stop
          ON stop.tenant_id = manifest_student.tenant_id
         AND stop.id = manifest_student.pickup_stop_id
        LEFT JOIN LATERAL (
          SELECT event.event_type, event.event_time
          FROM transport_trip_events event
          INNER JOIN transport_trips trip
            ON trip.tenant_id = event.tenant_id
           AND trip.id = event.trip_id
          WHERE event.tenant_id = manifest_student.tenant_id
            AND trip.manifest_id = manifest.id
            AND event.student_id::text = manifest_student.student_id::text
          ORDER BY event.event_time DESC
          LIMIT 1
        ) latest_event ON TRUE
        WHERE manifest_student.tenant_id = $1
          AND manifest_student.boarding_status = 'active'
          AND (manifest.effective_to IS NULL OR manifest.effective_to >= CURRENT_DATE)
        ORDER BY route.name ASC, student.admission_number ASC
      `,
      [tenantId],
    );

    return result.rows;
  }

  async validateManifestReferences(input: {
    tenant_id: string;
    route_id: string;
    academic_term_id?: string;
    student_ids: string[];
  }): Promise<TransportManifestReferenceCheck> {
    const result = await this.executeSql<TransportManifestReferenceCheck>(
      `
        SELECT
          EXISTS (
            SELECT 1
            FROM transport_routes route
            WHERE route.tenant_id = $1
              AND route.id::text = $2
              AND route.status = 'active'
          ) AS route_exists,
          (
            $3::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM academic_terms term
              WHERE term.tenant_id = $1
                AND term.id::text = $3
            )
          ) AS academic_term_exists,
          (
            SELECT COUNT(DISTINCT student.id)::int
            FROM students student
            WHERE student.tenant_id = $1
              AND student.id::text IN (
                SELECT jsonb_array_elements_text($4::jsonb)
              )
              AND lower(COALESCE(student.status, 'active')) NOT IN (
                'archived', 'transferred', 'graduated'
              )
          ) AS student_count
      `,
      [
        input.tenant_id,
        input.route_id,
        input.academic_term_id ?? null,
        JSON.stringify(input.student_ids),
      ],
    );

    return result.rows[0] ?? {
      route_exists: false,
      academic_term_exists: false,
      student_count: 0,
    };
  }

  async getDashboard(tenantId: string) {
    const [summary, routes, vehicles, manifests, trips, alerts] = await Promise.all([
      this.executeSql<TransportDashboardSummary>(
        `
          SELECT
            (SELECT COUNT(*)::int FROM transport_routes WHERE tenant_id = $1 AND status = 'active') AS active_routes,
            (SELECT COUNT(*)::int FROM transport_vehicles WHERE tenant_id = $1 AND status = 'active') AS active_vehicles,
            (SELECT COUNT(*)::int FROM transport_manifests WHERE tenant_id = $1 AND status = 'active') AS active_manifests,
            (SELECT COUNT(*)::int FROM transport_trips WHERE tenant_id = $1 AND trip_date = CURRENT_DATE) AS trips_today,
            (SELECT COUNT(*)::int FROM transport_alerts WHERE tenant_id = $1 AND status = 'open') AS open_alerts,
            (SELECT COUNT(*)::int FROM transport_vehicles WHERE tenant_id = $1 AND status = 'active' AND service_due_date <= CURRENT_DATE) AS service_due_vehicles
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            route.id::text,
            route.name,
            route.direction,
            route.zone,
            route.status,
            COUNT(DISTINCT stop.id)::int AS active_stops,
            COUNT(DISTINCT manifest_student.student_id)::int AS learner_count
          FROM transport_routes route
          LEFT JOIN transport_route_stops stop
            ON stop.tenant_id = route.tenant_id
           AND stop.route_id = route.id
           AND stop.is_active = TRUE
          LEFT JOIN transport_manifests manifest
            ON manifest.tenant_id = route.tenant_id
           AND manifest.route_id = route.id
           AND manifest.status = 'active'
          LEFT JOIN transport_manifest_students manifest_student
            ON manifest_student.tenant_id = manifest.tenant_id
           AND manifest_student.manifest_id = manifest.id
           AND manifest_student.boarding_status = 'active'
          WHERE route.tenant_id = $1
          GROUP BY route.id
          ORDER BY route.name ASC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            id::text,
            registration_number,
            capacity,
            ownership_type,
            status,
            CASE
              WHEN service_due_date <= CURRENT_DATE THEN 'due'
              WHEN service_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'soon'
              ELSE 'ok'
            END AS service_status,
            service_due_date::text,
            insurance_expiry_date::text
          FROM transport_vehicles
          WHERE tenant_id = $1
          ORDER BY registration_number ASC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            manifest.id::text,
            route.name AS route_name,
            manifest.status,
            manifest.effective_from::text,
            manifest.effective_to::text,
            COUNT(manifest_student.student_id)::int AS learner_count
          FROM transport_manifests manifest
          INNER JOIN transport_routes route
            ON route.tenant_id = manifest.tenant_id
           AND route.id = manifest.route_id
          LEFT JOIN transport_manifest_students manifest_student
            ON manifest_student.tenant_id = manifest.tenant_id
           AND manifest_student.manifest_id = manifest.id
           AND manifest_student.boarding_status = 'active'
          WHERE manifest.tenant_id = $1
          GROUP BY manifest.id, route.name
          ORDER BY manifest.created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            trip.id::text,
            route.name AS route_name,
            vehicle.registration_number AS vehicle_registration,
            driver.name AS driver_name,
            trip.direction,
            trip.status,
            trip.trip_date::text,
            trip.learner_count
          FROM transport_trips trip
          INNER JOIN transport_routes route
            ON route.tenant_id = trip.tenant_id
           AND route.id = trip.route_id
          INNER JOIN transport_vehicles vehicle
            ON vehicle.tenant_id = trip.tenant_id
           AND vehicle.id = trip.vehicle_id
          LEFT JOIN transport_drivers driver
            ON driver.tenant_id = trip.tenant_id
           AND driver.id = trip.driver_id
          WHERE trip.tenant_id = $1
          ORDER BY trip.trip_date DESC, trip.created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            id::text,
            title,
            message,
            severity,
            status,
            created_at
          FROM transport_alerts
          WHERE tenant_id = $1
            AND status = 'open'
          ORDER BY
            CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
            created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
    ]);

    return {
      ...(summary.rows[0] ?? {
        active_routes: 0,
        active_vehicles: 0,
        active_manifests: 0,
        trips_today: 0,
        open_alerts: 0,
        service_due_vehicles: 0,
      }),
      routes: routes.rows,
      vehicles: vehicles.rows,
      manifests: manifests.rows,
      trips: trips.rows,
      alerts: alerts.rows,
    };
  }

  async createRoute(input: Record<string, unknown>) {
    return this.prisma.withRequestTransaction(async () => {
      const result = await this.executeSql(
        `
          INSERT INTO transport_routes (
            tenant_id, name, code, direction, zone, fare_amount_minor, created_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.name,
          input.code ?? null,
          input.direction,
          input.zone ?? null,
          input.fare_amount_minor ?? 0,
          input.created_by_user_id,
        ],
      );
      const route = result.rows[0];

      for (const stop of (input.stops ?? []) as Array<Record<string, unknown>>) {
        await this.executeSql(
          `
            INSERT INTO transport_route_stops (
              tenant_id, route_id, name, stop_sequence, planned_time,
              latitude, longitude, notes
            )
            VALUES ($1, $2::uuid, $3, $4, $5::time, $6, $7, $8)
          `,
          [
            input.tenant_id,
            route.id,
            stop.name,
            stop.sequence,
            stop.planned_time ?? null,
            stop.latitude ?? null,
            stop.longitude ?? null,
            stop.notes ?? null,
          ],
        );
      }

      return route;
    });
  }

  async createVehicle(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO transport_vehicles (
          tenant_id, registration_number, capacity, ownership_type, make, model,
          service_due_date, insurance_expiry_date, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.registration_number,
        input.capacity,
        input.ownership_type,
        input.make ?? null,
        input.model ?? null,
        input.service_due_date ?? null,
        input.insurance_expiry_date ?? null,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async createDriver(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO transport_drivers (
          tenant_id, staff_id, name, phone, license_number, license_expiry_date,
          created_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6::date, $7::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.staff_id ?? null,
        input.name,
        input.phone ?? null,
        input.license_number ?? null,
        input.license_expiry_date ?? null,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async createManifest(input: Record<string, unknown>) {
    return this.prisma.withRequestTransaction(async (tx) => {
      const manifests = await tx.$queryRawUnsafe(
        `
          INSERT INTO transport_manifests (
            tenant_id, route_id, academic_term_id, effective_from, effective_to,
            created_by_user_id
          )
          SELECT
            $1,
            route.id,
            $3::uuid,
            COALESCE($4::date, CURRENT_DATE),
            $5::date,
            $6::uuid
          FROM transport_routes route
          WHERE route.tenant_id = $1
            AND route.id::text = $2
            AND route.status = 'active'
            AND (
              $3::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM academic_terms term
                WHERE term.tenant_id = $1
                  AND term.id::text = $3
              )
            )
          RETURNING *
        `,
        input.tenant_id,
        input.route_id,
        input.academic_term_id ?? null,
        input.effective_from ?? null,
        input.effective_to ?? null,
        input.created_by_user_id,
      ) as Array<Record<string, unknown>>;
      const manifest = manifests[0] as ({ id: string } & Record<string, unknown>) | undefined;

      if (!manifest) {
        throw new BadRequestException(
          'Transport route and academic term must belong to the current school',
        );
      }

      for (const studentId of (input.student_ids ?? []) as string[]) {
        const assignments = await tx.$queryRawUnsafe(
          `
            INSERT INTO transport_manifest_students (
              tenant_id, manifest_id, student_id, boarding_status
            )
            SELECT $1, $2::uuid, student.id::text::uuid, 'active'
            FROM students student
            WHERE student.tenant_id = $1
              AND student.id::text = $3
              AND lower(COALESCE(student.status, 'active')) NOT IN (
                'archived', 'transferred', 'graduated'
              )
            ON CONFLICT (tenant_id, manifest_id, student_id)
            DO UPDATE SET boarding_status = 'active', updated_at = NOW()
            RETURNING id::text
          `,
          input.tenant_id,
          manifest.id,
          studentId,
        ) as Array<Record<string, unknown>>;

        if (assignments.length !== 1) {
          throw new BadRequestException(
            'Every transport student assignment must belong to the current school',
          );
        }
      }

      return manifest;
    });
  }

  async startTrip(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO transport_trips (
          tenant_id, route_id, vehicle_id, driver_id, manifest_id, trip_date,
          direction, scheduled_start_at, actual_start_at, learner_count,
          status, started_by_user_id
        )
        VALUES (
          $1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, COALESCE($6::date, CURRENT_DATE),
          $7, $8::time, NOW(), $9, 'in_progress', $10::uuid
        )
        RETURNING *
      `,
      [
        input.tenant_id,
        input.route_id,
        input.vehicle_id,
        input.driver_id ?? null,
        input.manifest_id ?? null,
        input.trip_date ?? null,
        input.direction ?? 'morning',
        input.scheduled_start_at ?? null,
        input.learner_count ?? 0,
        input.started_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async recordTripEvent(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO transport_trip_events (
          tenant_id, trip_id, event_type, student_id, stop_id, notes,
          latitude, longitude, metadata, recorded_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4::uuid, $5::uuid, $6, $7, $8, $9::jsonb, $10::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.trip_id,
        input.event_type,
        input.student_id ?? null,
        input.stop_id ?? null,
        input.notes ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.recorded_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async recordVehicleService(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO vehicle_service_logs (
          tenant_id, vehicle_id, service_date, odometer_reading, next_service_date,
          cost_minor, service_provider, notes, recorded_by_user_id
        )
        VALUES ($1, $2::uuid, COALESCE($3::date, CURRENT_DATE), $4, $5::date, $6, $7, $8, $9::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.vehicle_id,
        input.service_date ?? null,
        input.odometer_reading ?? null,
        input.next_service_date ?? null,
        input.cost_minor ?? 0,
        input.service_provider ?? null,
        input.notes ?? null,
        input.recorded_by_user_id,
      ],
    );

    if (input.next_service_date) {
      await this.executeSql(
        `
          UPDATE transport_vehicles
          SET service_due_date = $3::date,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
        `,
        [input.tenant_id, input.vehicle_id, input.next_service_date],
      );
    }

    return result.rows[0];
  }

  async resolveAlert(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        UPDATE transport_alerts
        SET status = 'resolved',
            resolved_at = NOW(),
            resolved_by_user_id = $3::uuid,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [input.tenant_id, input.alert_id, input.resolved_by_user_id],
    );

    return result.rows[0];
  }

  async appendAuditLog(input: Record<string, unknown>) {
    await this.executeSql(
      `
        INSERT INTO transport_audit_logs (
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
    );
  }
}
