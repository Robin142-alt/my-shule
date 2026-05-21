import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

export interface TransportDashboardSummary {
  active_routes: number;
  active_vehicles: number;
  active_manifests: number;
  trips_today: number;
  open_alerts: number;
  service_due_vehicles: number;
}

@Injectable()
export class TransportRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDashboard(tenantId: string) {
    const [summary, routes, vehicles, manifests, trips, alerts] = await Promise.all([
      this.databaseService.query<TransportDashboardSummary>(
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
      this.databaseService.query(
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
      this.databaseService.query(
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
      this.databaseService.query(
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
      this.databaseService.query(
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
      this.databaseService.query(
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
    return this.databaseService.withRequestTransaction(async () => {
      const result = await this.databaseService.query(
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
        await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    return this.databaseService.withRequestTransaction(async () => {
      const result = await this.databaseService.query(
        `
          INSERT INTO transport_manifests (
            tenant_id, route_id, academic_term_id, effective_from, effective_to,
            created_by_user_id
          )
          VALUES ($1, $2::uuid, $3::uuid, COALESCE($4::date, CURRENT_DATE), $5::date, $6::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.route_id,
          input.academic_term_id ?? null,
          input.effective_from ?? null,
          input.effective_to ?? null,
          input.created_by_user_id,
        ],
      );
      const manifest = result.rows[0];

      for (const studentId of (input.student_ids ?? []) as string[]) {
        await this.databaseService.query(
          `
            INSERT INTO transport_manifest_students (
              tenant_id, manifest_id, student_id, boarding_status
            )
            VALUES ($1, $2::uuid, $3::uuid, 'active')
            ON CONFLICT (tenant_id, manifest_id, student_id)
            DO UPDATE SET boarding_status = 'active', updated_at = NOW()
          `,
          [input.tenant_id, manifest.id, studentId],
        );
      }

      return manifest;
    });
  }

  async startTrip(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
      await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    await this.databaseService.query(
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
    ).catch(() => undefined);
  }
}
