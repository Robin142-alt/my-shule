import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class TransportManagerCommandService {
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

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id || null;
  }

  private requireUuid(value: unknown, label: string): string {
    const uuid = this.operations.uuidOrNull(value);
    if (!uuid) {
      throw new BadRequestException(`${label} must be a valid identifier`);
    }
    return uuid;
  }

  private requireActorUserId(): string {
    const userId = this.operations.uuidOrNull(this.currentUserId());
    if (!userId) {
      throw new UnauthorizedException('Authenticated user context is required');
    }
    return userId;
  }

  private currentActorRole(): string {
    return this.optionalText(this.requestContext.getStore()?.role, 80) ?? 'transport_manager';
  }

  private optionalDate(value: unknown, label: string): string | null {
    const text = String(value ?? '').trim();
    if (!text) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new BadRequestException(`${label} must use YYYY-MM-DD format`);
    }
    const parsed = new Date(`${text}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
      throw new BadRequestException(`${label} is not a valid calendar date`);
    }
    return text;
  }

  private optionalNonNegativeInteger(value: unknown, label: string): number | null {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0) {
      throw new BadRequestException(`${label} must be a non-negative whole number`);
    }
    return number;
  }

  private costMinor(dto: any): number {
    const explicitMinor = dto?.cost_minor ?? dto?.costMinor;
    if (explicitMinor !== undefined && explicitMinor !== null && String(explicitMinor).trim() !== '') {
      const minor = Number(explicitMinor);
      if (!Number.isSafeInteger(minor) || minor < 0) {
        throw new BadRequestException('Cost in minor units must be a non-negative whole number');
      }
      return minor;
    }

    const legacyKes = dto?.cost;
    if (legacyKes === undefined || legacyKes === null || String(legacyKes).trim() === '') return 0;
    const kes = Number(legacyKes);
    const minor = Math.round(kes * 100);
    if (!Number.isFinite(kes) || kes < 0 || !Number.isSafeInteger(minor)) {
      throw new BadRequestException('Cost must be a valid non-negative amount');
    }
    return minor;
  }

  private optionalText(value: unknown, maxLength: number): string | null {
    const text = String(value ?? '').trim();
    return text ? text.slice(0, maxLength) : null;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  async getAssignmentOptions() {
    const tenantId = this.requireTenantId();
    const [routes, manifests, students, stops, vehicles] = await Promise.all([
      this.executeSql<{ id: string; label: string; status: string | null }>(
        `
          SELECT
            route.id::text,
            CONCAT(route.name, COALESCE(' - ' || NULLIF(route.code, ''), '')) AS label,
            route.status
          FROM transport_routes route
          WHERE route.tenant_id = $1
            AND lower(route.status::text) = 'active'
          ORDER BY route.name ASC
          LIMIT 200
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; route_id: string; label: string; status: string | null }>(
        `
          SELECT
            manifest.id::text,
            manifest.route_id::text,
            CONCAT(route.name, ' manifest from ', manifest.effective_from::text) AS label,
            manifest.status
          FROM transport_manifests manifest
          INNER JOIN transport_routes route
            ON route.tenant_id = manifest.tenant_id
           AND route.id::text = manifest.route_id::text
          WHERE manifest.tenant_id = $1
            AND manifest.status = 'active'
          ORDER BY route.name ASC, manifest.effective_from DESC
          LIMIT 200
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; label: string; class_id: string | null; guardian_contact: string | null }>(
        `
          SELECT
            student.id::text,
            CONCAT_WS(
              ' - ',
              NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), ''),
              NULLIF(student.admission_number, '')
            ) AS label,
            student.current_class_id AS class_id,
            student.primary_guardian_phone AS guardian_contact
          FROM students student
          WHERE student.tenant_id = $1
            AND student.deleted_at IS NULL
            AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
          ORDER BY student.last_name ASC, student.first_name ASC, student.admission_number ASC
          LIMIT 500
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; route_id: string; label: string }>(
        `
          SELECT
            stop.id::text,
            stop.route_id::text,
            CONCAT(route.name, ' - ', stop.stop_sequence::text, '. ', stop.name) AS label
          FROM transport_route_stops stop
          INNER JOIN transport_routes route
            ON route.tenant_id = stop.tenant_id
           AND route.id::text = stop.route_id::text
          WHERE stop.tenant_id = $1
            AND stop.is_active = true
          ORDER BY route.name ASC, stop.stop_sequence ASC
          LIMIT 500
        `,
        [tenantId],
      ),
      this.executeSql<{ id: string; label: string; status: string | null }>(
        `
          SELECT
            vehicle.id::text,
            CONCAT(
              vehicle.registration_number,
              COALESCE(' - ' || NULLIF(TRIM(CONCAT_WS(' ', vehicle.make, vehicle.model)), ''), ''),
              ' (', vehicle.status, ')'
            ) AS label,
            vehicle.status
          FROM transport_vehicles vehicle
          WHERE vehicle.tenant_id = $1
            AND lower(vehicle.status::text) IN ('active', 'maintenance')
          ORDER BY vehicle.registration_number ASC
          LIMIT 200
        `,
        [tenantId],
      ),
    ]);

    return {
      routes: routes.rows,
      manifests: manifests.rows,
      students: students.rows,
      stops: stops.rows,
      vehicles: vehicles.rows,
    };
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      total_vehicles: number;
      total_drivers: number;
      total_routes: number;
      active_routes: number;
      students_transported: number;
      trips_today: number;
    }>(
      `
        SELECT
          (SELECT COUNT(*)::int FROM transport_vehicles vehicle WHERE vehicle.tenant_id = $1) AS total_vehicles,
          (SELECT COUNT(*)::int FROM transport_drivers driver WHERE driver.tenant_id = $1) AS total_drivers,
          (SELECT COUNT(*)::int FROM transport_routes route WHERE route.tenant_id = $1) AS total_routes,
          (SELECT COUNT(*)::int FROM transport_routes route WHERE route.tenant_id = $1 AND lower(route.status::text) = 'active') AS active_routes,
          (
            SELECT COUNT(DISTINCT manifest_student.student_id)::int
            FROM transport_manifest_students manifest_student
            INNER JOIN transport_manifests manifest
              ON manifest.tenant_id = manifest_student.tenant_id
             AND manifest.id = manifest_student.manifest_id
            WHERE manifest_student.tenant_id = $1
              AND manifest_student.boarding_status = 'active'
              AND manifest.status = 'active'
          ) AS students_transported,
          (SELECT COUNT(*)::int FROM transport_trips trip WHERE trip.tenant_id = $1 AND trip.trip_date::date = CURRENT_DATE) AS trips_today
      `,
      [tenantId],
    );
    const row = result.rows[0] ?? {
      total_vehicles: 0,
      total_drivers: 0,
      total_routes: 0,
      active_routes: 0,
      students_transported: 0,
      trips_today: 0,
    };
    const metrics = {
      total_vehicles: Number(row.total_vehicles || 0),
      totalVehicles: Number(row.total_vehicles || 0),
      totalDrivers: Number(row.total_drivers || 0),
      totalRoutes: Number(row.total_routes || 0),
      active_routes: Number(row.active_routes || 0),
      students_transported: Number(row.students_transported || 0),
      trips_today: Number(row.trips_today || 0),
      todayTrips: Number(row.trips_today || 0),
    };
    return {
      metrics,
      overviewList: [
        { id: 'total-vehicles', metric: 'Total vehicles', value: String(metrics.total_vehicles) },
        { id: 'active-routes', metric: 'Active routes', value: String(metrics.active_routes) },
        { id: 'students-transported', metric: 'Students assigned', value: String(metrics.students_transported) },
        { id: 'trips-today', metric: 'Trips today', value: String(metrics.trips_today) },
      ],
      data: [],
    };
  }

  async getVehicles() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      id: string;
      registration: string;
      make_model: string;
      capacity: number;
      driver: string;
      last_service: string;
      status: string;
    }>(
      `
        SELECT
          vehicle.id::text,
          vehicle.registration_number,
          vehicle.registration_number AS registration,
          vehicle.make,
          vehicle.model,
          vehicle.ownership_type,
          vehicle.insurance_expiry_date::text,
          vehicle.service_due_date::text,
          TRIM(CONCAT_WS(' ', vehicle.make, vehicle.model)) AS make_model,
          vehicle.capacity::int,
          COALESCE(latest_driver.name, '') AS driver,
          COALESCE(latest_driver.name, '') AS assigned_driver,
          COALESCE(current_assignment.route_name, latest_driver.route_name, '') AS assigned_route,
          COALESCE(latest_service.service_date::text, '') AS last_service,
          INITCAP(REPLACE(vehicle.status::text, '_', ' ')) AS status
        FROM transport_vehicles vehicle
        LEFT JOIN LATERAL (
          SELECT driver.name, route.name AS route_name
          FROM transport_trips trip
          INNER JOIN transport_drivers driver
            ON driver.tenant_id = trip.tenant_id
           AND driver.id::text = trip.driver_id::text
          INNER JOIN transport_routes route
            ON route.tenant_id = trip.tenant_id
           AND route.id::text = trip.route_id::text
          WHERE trip.tenant_id = vehicle.tenant_id
            AND trip.vehicle_id::text = vehicle.id::text
          ORDER BY trip.trip_date DESC, trip.created_at DESC, trip.id DESC
          LIMIT 1
        ) latest_driver ON TRUE
        LEFT JOIN LATERAL (
          SELECT route.name AS route_name
          FROM transport_routes route
          WHERE route.tenant_id = vehicle.tenant_id
            AND route.assigned_vehicle_id::text = vehicle.id::text
            AND lower(route.status::text) = 'active'
          ORDER BY route.vehicle_assigned_at DESC NULLS LAST, route.updated_at DESC, route.id DESC
          LIMIT 1
        ) current_assignment ON TRUE
        LEFT JOIN LATERAL (
          SELECT service_log.service_date
          FROM vehicle_service_logs service_log
          WHERE service_log.tenant_id = vehicle.tenant_id
            AND service_log.vehicle_id::text = vehicle.id::text
          ORDER BY service_log.service_date DESC, service_log.created_at DESC, service_log.id DESC
          LIMIT 1
        ) latest_service ON TRUE
        WHERE vehicle.tenant_id = $1
        ORDER BY vehicle.registration_number ASC
      `,
      [tenantId],
    );
    return {
      metrics: {
        total_vehicles: result.rows.length,
        active: result.rows.filter((vehicle) => vehicle.status.toLowerCase() === 'active').length,
        in_maintenance: result.rows.filter((vehicle) => vehicle.status.toLowerCase() === 'maintenance').length,
      },
      vehiclesList: result.rows,
      data: result.rows,
    };
  }

  async createVehicle(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        INSERT INTO transport_vehicles (
          tenant_id, registration_number, capacity, ownership_type, make, model, service_due_date, insurance_expiry_date, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9::uuid)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(dto?.registration_number ?? dto?.plate_number ?? dto?.plateNumber, 'Registration number'),
        Math.max(1, Number(dto?.capacity || 1)),
        dto?.ownership_type || 'school_owned',
        dto?.make || null,
        dto?.model || null,
        dto?.service_due_date ?? dto?.serviceDueDate ?? null,
        dto?.insurance_expiry_date ?? dto?.insuranceExpiryDate ?? null,
        userId,
      ],
    );
    const vehicle = result.rows[0];
    await this.operations.recordAudit(tenantId, 'transport.vehicle_created', 'transport_vehicle', vehicle.id, { vehicle }, userId);
    return { success: true, message: 'Vehicle created', vehicle };
  }

  async updateVehicle(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        UPDATE transport_vehicles
        SET registration_number = COALESCE(NULLIF($3, ''), registration_number),
            capacity = COALESCE($4, capacity),
            ownership_type = COALESCE(NULLIF($5, ''), ownership_type),
            make = COALESCE($6, make),
            model = COALESCE($7, model),
            service_due_date = COALESCE($8::date, service_due_date),
            insurance_expiry_date = COALESCE($9::date, insurance_expiry_date),
            status = COALESCE(NULLIF($10, ''), status),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Vehicle ID'),
        dto?.registration_number ?? dto?.plate_number ?? dto?.plateNumber ?? null,
        dto?.capacity ?? null,
        dto?.ownership_type ?? null,
        dto?.make ?? null,
        dto?.model ?? null,
        dto?.service_due_date ?? dto?.serviceDueDate ?? null,
        dto?.insurance_expiry_date ?? dto?.insuranceExpiryDate ?? null,
        dto?.status ?? null,
      ],
    );
    const vehicle = result.rows[0];
    if (!vehicle) throw new NotFoundException('Vehicle was not found in this school');
    await this.operations.recordAudit(tenantId, 'transport.vehicle_updated', 'transport_vehicle', vehicle.id, { vehicle, changes: dto }, userId);
    return { success: true, message: 'Vehicle updated', vehicle };
  }

  async updateVehicleStatus(id: string, status: 'active' | 'maintenance' | 'suspended' | 'retired') {
    return this.updateVehicle(id, { status });
  }

  async getDrivers() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      id: string;
      name: string;
      license_no: string;
      phone: string;
      assigned_vehicle: string;
      status: string;
      on_duty: boolean;
    }>(
      `
        SELECT
          driver.id::text,
          driver.name,
          driver.license_number,
          COALESCE(driver.license_number, '') AS license_no,
          COALESCE(driver.phone, '') AS phone,
          COALESCE(latest_trip.registration_number, '') AS assigned_vehicle,
          INITCAP(REPLACE(driver.status, '_', ' ')) AS status,
          EXISTS (
            SELECT 1
            FROM transport_trips duty_trip
            WHERE duty_trip.tenant_id = driver.tenant_id
              AND duty_trip.driver_id::text = driver.id::text
              AND duty_trip.trip_date::date = CURRENT_DATE
              AND duty_trip.status = 'in_progress'
          ) AS on_duty
        FROM transport_drivers driver
        LEFT JOIN LATERAL (
          SELECT vehicle.registration_number
          FROM transport_trips trip
          INNER JOIN transport_vehicles vehicle
            ON vehicle.tenant_id = trip.tenant_id
           AND vehicle.id::text = trip.vehicle_id::text
          WHERE trip.tenant_id = driver.tenant_id
            AND trip.driver_id::text = driver.id::text
          ORDER BY trip.trip_date DESC, trip.created_at DESC, trip.id DESC
          LIMIT 1
        ) latest_trip ON TRUE
        WHERE driver.tenant_id = $1
        ORDER BY driver.name ASC
      `,
      [tenantId],
    );
    const driversList = result.rows.map(({ on_duty: _onDuty, ...driver }) => driver);
    return {
      metrics: {
        total_drivers: result.rows.length,
        on_duty: result.rows.filter((driver) => driver.on_duty).length,
        off_duty: result.rows.filter((driver) => driver.status.toLowerCase() === 'active' && !driver.on_duty).length,
      },
      driversList,
      data: result.rows,
    };
  }

  async createDriver(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        INSERT INTO transport_drivers (tenant_id, staff_id, name, phone, license_number, license_expiry_date, created_by_user_id)
        VALUES ($1, $2::uuid, $3, $4, $5, $6::date, $7::uuid)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(dto?.staff_id ?? dto?.staffId),
        this.operations.requiredText(dto?.name, 'Driver name'),
        dto?.phone || null,
        dto?.license_number ?? dto?.licenseNumber ?? null,
        dto?.license_expiry_date ?? dto?.licenseExpiryDate ?? null,
        userId,
      ],
    );
    const driver = result.rows[0];
    await this.operations.recordAudit(tenantId, 'transport.driver_created', 'transport_driver', driver.id, { driver }, userId);
    return { success: true, message: 'Driver created', driver };
  }

  async updateDriver(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        UPDATE transport_drivers
        SET staff_id = COALESCE($3::uuid, staff_id),
            name = COALESCE(NULLIF($4, ''), name),
            phone = COALESCE($5, phone),
            license_number = COALESCE($6, license_number),
            license_expiry_date = COALESCE($7::date, license_expiry_date),
            status = COALESCE(NULLIF($8, ''), status),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Driver ID'),
        this.operations.uuidOrNull(dto?.staff_id ?? dto?.staffId),
        dto?.name ?? null,
        dto?.phone ?? null,
        dto?.license_number ?? dto?.licenseNumber ?? null,
        dto?.license_expiry_date ?? dto?.licenseExpiryDate ?? null,
        dto?.status ?? null,
      ],
    );
    const driver = result.rows[0];
    if (!driver) throw new NotFoundException('Driver was not found in this school');
    await this.operations.recordAudit(tenantId, 'transport.driver_updated', 'transport_driver', driver.id, { driver, changes: dto }, userId);
    return { success: true, message: 'Driver updated', driver };
  }

  async updateDriverStatus(id: string, status: 'active' | 'suspended' | 'retired', dto: any = {}) {
    const result = await this.updateDriver(id, { status });
    await this.operations.notifyRoles(this.requireTenantId(), {
      key: `transport-driver-${status}-${id}`,
      type: `transport.driver_${status}`,
      title: `Driver ${status}`,
      body: `Driver ${id} was marked ${status}.${dto?.reason ? ` Reason: ${dto.reason}` : ''}`,
      targetRoles: ['principal', 'transport_manager'],
      metadata: { id, status, reason: dto?.reason },
    });
    return result;
  }

  async getRoutes() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql<{
      id: string;
      route_name: string;
      pickup_points: number;
      students_count: number;
      driver: string;
      vehicle: string;
      status: string;
    }>(
      `
        SELECT
          route.id::text,
          route.name AS route_name,
          route.code,
          route.zone,
          route.direction,
          COUNT(DISTINCT stop.id) FILTER (WHERE COALESCE(stop.is_active, false))::int AS pickup_points,
          COUNT(DISTINCT manifest_student.student_id) FILTER (
            WHERE manifest.status = 'active'
              AND manifest_student.boarding_status = 'active'
          )::int AS students_count,
          COUNT(DISTINCT manifest_student.student_id) FILTER (
            WHERE manifest.status = 'active'
              AND manifest_student.boarding_status = 'active'
          )::int AS learner_count,
          COALESCE(latest_trip.driver, '') AS driver,
          COALESCE(assigned_vehicle.registration_number, latest_trip.vehicle, '') AS vehicle,
          INITCAP(REPLACE(route.status::text, '_', ' ')) AS status
        FROM transport_routes route
        LEFT JOIN transport_route_stops stop
          ON stop.tenant_id = route.tenant_id
         AND stop.route_id::text = route.id::text
        LEFT JOIN transport_manifests manifest
          ON manifest.tenant_id = route.tenant_id
         AND manifest.route_id::text = route.id::text
        LEFT JOIN transport_manifest_students manifest_student
          ON manifest_student.tenant_id = manifest.tenant_id
         AND manifest_student.manifest_id::text = manifest.id::text
        LEFT JOIN transport_vehicles assigned_vehicle
          ON assigned_vehicle.tenant_id = route.tenant_id
         AND assigned_vehicle.id::text = route.assigned_vehicle_id::text
        LEFT JOIN LATERAL (
          SELECT
            driver.name AS driver,
            vehicle.registration_number AS vehicle
          FROM transport_trips trip
          INNER JOIN transport_vehicles vehicle
            ON vehicle.tenant_id = trip.tenant_id
           AND vehicle.id::text = trip.vehicle_id::text
          LEFT JOIN transport_drivers driver
            ON driver.tenant_id = trip.tenant_id
           AND driver.id::text = trip.driver_id::text
          WHERE trip.tenant_id = route.tenant_id
            AND trip.route_id::text = route.id::text
          ORDER BY trip.trip_date DESC, trip.created_at DESC, trip.id DESC
          LIMIT 1
        ) latest_trip ON TRUE
        WHERE route.tenant_id = $1
        GROUP BY route.id, route.name, route.status, assigned_vehicle.registration_number, latest_trip.driver, latest_trip.vehicle
        ORDER BY route.name ASC
      `,
      [tenantId],
    );
    return {
      metrics: {
        total_routes: res.rows.length,
        active_routes: res.rows.filter((route) => route.status.toLowerCase() === 'active').length,
      },
      routesList: res.rows,
      data: res.rows,
    };
  }

  async createRoute(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        INSERT INTO transport_routes (tenant_id, name, code, direction, zone, fare_amount_minor, created_by_user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(dto?.name ?? dto?.route_name, 'Route name'),
        dto?.code || null,
        dto?.direction || 'round_trip',
        dto?.zone || null,
        Math.max(0, Number(dto?.fare_amount_minor ?? dto?.fare ?? 0) || 0),
        userId,
      ],
    );
    const route = result.rows[0];
    await this.operations.recordAudit(tenantId, 'transport.route_created', 'transport_route', route.id, { route }, userId);
    return { success: true, message: 'Route created', route };
  }

  async updateRoute(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        UPDATE transport_routes
        SET name = COALESCE(NULLIF($3, ''), name),
            code = COALESCE($4, code),
            direction = COALESCE(NULLIF($5, ''), direction),
            zone = COALESCE($6, zone),
            fare_amount_minor = COALESCE($7, fare_amount_minor),
            status = COALESCE(NULLIF($8, ''), status),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Route ID'),
        dto?.name ?? dto?.route_name ?? null,
        dto?.code ?? null,
        dto?.direction ?? null,
        dto?.zone ?? null,
        dto?.fare_amount_minor ?? dto?.fare ?? null,
        dto?.status ?? null,
      ],
    );
    const route = result.rows[0];
    if (!route) throw new NotFoundException('Route was not found in this school');
    await this.operations.recordAudit(tenantId, 'transport.route_updated', 'transport_route', route.id, { route, changes: dto }, userId);
    return { success: true, message: 'Route updated', route };
  }

  async assignVehicleToRoute(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireActorUserId();
    const actorRole = this.currentActorRole();
    const routeId = this.requireUuid(id, 'Route');
    const vehicleId = this.requireUuid(dto?.vehicle_id ?? dto?.vehicleId, 'Vehicle');
    const result = await this.operations.writeSql(
      `
        WITH selected_vehicle AS (
          SELECT vehicle.id, vehicle.tenant_id, vehicle.registration_number
          FROM transport_vehicles vehicle
          WHERE vehicle.tenant_id = $1
            AND vehicle.id = $3::uuid
            AND lower(vehicle.status::text) = 'active'
        ), updated_route AS (
          UPDATE transport_routes route
          SET assigned_vehicle_id = selected_vehicle.id,
              vehicle_assigned_at = NOW(),
              vehicle_assigned_by_user_id = $4::uuid,
              updated_at = NOW()
          FROM selected_vehicle
          WHERE route.tenant_id = $1
            AND route.id = $2::uuid
            AND lower(route.status::text) = 'active'
          RETURNING
            route.id,
            route.tenant_id,
            route.name,
            route.assigned_vehicle_id,
            route.vehicle_assigned_at,
            route.vehicle_assigned_by_user_id
        ), workflow_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            updated_route.tenant_id,
            $4::uuid,
            $5,
            '["transport_manager","principal"]'::jsonb,
            'transport.route_vehicle_assigned',
            'transport_route',
            updated_route.id::text,
            'Vehicle assigned to route',
            CONCAT(selected_vehicle.registration_number, ' was assigned to ', updated_route.name, '.'),
            'normal',
            jsonb_build_object(
              'route_id', updated_route.id::text,
              'vehicle_id', selected_vehicle.id::text,
              'registration_number', selected_vehicle.registration_number,
              'source_dashboard', 'transport-manager',
              'correlation_id', NULLIF(current_setting('app.request_id', true), '')
            )
          FROM updated_route
          INNER JOIN selected_vehicle ON selected_vehicle.id = updated_route.assigned_vehicle_id
          RETURNING id
        ), mutation_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            updated_route.tenant_id,
            $4::uuid,
            current_setting('app.request_id', true),
            'transport.route_vehicle_assigned',
            'transport_route',
            updated_route.id,
            jsonb_build_object(
              'route_id', updated_route.id::text,
              'vehicle_id', selected_vehicle.id::text,
              'registration_number', selected_vehicle.registration_number
            )
          FROM updated_route
          INNER JOIN selected_vehicle ON selected_vehicle.id = updated_route.assigned_vehicle_id
          RETURNING id
        ), role_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body,
            status, priority, source_module, source_record_id, metadata
          )
          SELECT
            updated_route.tenant_id,
            CONCAT('transport:route-vehicle:', workflow_event.id::text, ':', recipient.role_name),
            recipient.role_name,
            'transport.route_vehicle_assigned',
            'Route vehicle assigned',
            CONCAT(selected_vehicle.registration_number, ' was assigned to ', updated_route.name, '.'),
            'unread',
            'normal',
            'transport',
            updated_route.id::text,
            jsonb_build_object(
              'target_roles', jsonb_build_array(recipient.role_name),
              'route_id', updated_route.id::text,
              'vehicle_id', selected_vehicle.id::text,
              'workflow_event_id', workflow_event.id::text,
              'source_dashboard', 'transport-manager'
            )
          FROM updated_route
          INNER JOIN selected_vehicle ON selected_vehicle.id = updated_route.assigned_vehicle_id
          CROSS JOIN workflow_event
          CROSS JOIN unnest(ARRAY['transport_manager', 'principal']::text[]) AS recipient(role_name)
          WHERE TRUE
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        )
        SELECT
          updated_route.id::text AS route_id,
          updated_route.name AS route_name,
          updated_route.assigned_vehicle_id::text AS vehicle_id,
          selected_vehicle.registration_number,
          updated_route.vehicle_assigned_at::text AS assigned_at,
          updated_route.vehicle_assigned_by_user_id::text AS assigned_by_user_id,
          (SELECT id::text FROM workflow_event LIMIT 1) AS workflow_event_id,
          (SELECT COUNT(*)::int FROM mutation_audit) AS audits_created,
          (SELECT COUNT(*)::int FROM role_notifications) AS notifications_created
        FROM updated_route
        INNER JOIN selected_vehicle ON selected_vehicle.id = updated_route.assigned_vehicle_id
      `,
      [tenantId, routeId, vehicleId, userId, actorRole],
    );
    const assignment = result.rows[0];
    if (!assignment) {
      throw new NotFoundException('An active route and vehicle were not found in this school');
    }
    return { success: true, message: 'Vehicle assigned to route', assignment };
  }

  async getTrips() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      id: string;
      route: string;
      driver: string;
      vehicle: string;
      departure_time: string;
      arrival_time: string;
      students: number;
      status: string;
      is_today: boolean;
    }>(
      `
        SELECT
          trip.id::text,
          trip.route_id::text,
          trip.vehicle_id::text,
          trip.driver_id::text,
          route.name AS route_name,
          route.name AS route,
          COALESCE(driver.name, '') AS driver_name,
          COALESCE(driver.name, '') AS driver,
          vehicle.registration_number AS vehicle_registration,
          vehicle.registration_number AS vehicle,
          trip.actual_end_at::text,
          trip.learner_count::int AS learner_count,
          COALESCE(trip.actual_start_at::text, trip.scheduled_start_at::text, '') AS departure_time,
          COALESCE(trip.actual_end_at::text, '') AS arrival_time,
          trip.learner_count::int AS students,
          INITCAP(REPLACE(trip.status, '_', ' ')) AS status,
          trip.trip_date::date = CURRENT_DATE AS is_today
        FROM transport_trips trip
        INNER JOIN transport_routes route
          ON route.tenant_id = trip.tenant_id
         AND route.id::text = trip.route_id::text
        INNER JOIN transport_vehicles vehicle
          ON vehicle.tenant_id = trip.tenant_id
         AND vehicle.id::text = trip.vehicle_id::text
        LEFT JOIN transport_drivers driver
          ON driver.tenant_id = trip.tenant_id
         AND driver.id::text = trip.driver_id::text
        WHERE trip.tenant_id = $1
        ORDER BY trip.trip_date DESC, trip.created_at DESC, trip.id DESC
        LIMIT 200
      `,
      [tenantId],
    );
    const todayTrips = result.rows.filter((trip) => trip.is_today);
    const tripsList = result.rows.map(({ is_today: _isToday, ...trip }) => trip);
    return {
      metrics: {
        trips_today: todayTrips.length,
        completed: todayTrips.filter((trip) => trip.status.toLowerCase() === 'completed').length,
        in_progress: todayTrips.filter((trip) => trip.status.toLowerCase() === 'in progress').length,
      },
      tripsList,
      data: result.rows,
    };
  }

  async logTrip(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        INSERT INTO transport_trips (
          tenant_id, route_id, vehicle_id, driver_id, manifest_id, trip_date, direction, scheduled_start_at, actual_start_at, learner_count, status, started_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, COALESCE($6::date, CURRENT_DATE), $7, $8::time, NOW(), $9, 'in_progress', $10::uuid)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(dto?.route_id ?? dto?.routeId, 'Route'),
        this.operations.requiredText(dto?.vehicle_id ?? dto?.vehicleId, 'Vehicle'),
        this.operations.uuidOrNull(dto?.driver_id ?? dto?.driverId),
        this.operations.uuidOrNull(dto?.manifest_id ?? dto?.manifestId),
        dto?.trip_date ?? dto?.tripDate ?? null,
        dto?.direction || 'morning',
        dto?.scheduled_start_at ?? dto?.scheduledStartAt ?? null,
        Math.max(0, Number(dto?.learner_count ?? dto?.learnerCount ?? 0) || 0),
        userId,
      ],
    );
    const trip = result.rows[0];
    await this.operations.recordAudit(tenantId, 'transport.trip_started', 'transport_trip', trip.id, { trip }, userId);
    return { success: true, message: 'Trip logged', trip };
  }

  async completeTrip(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        UPDATE transport_trips
        SET status = 'completed',
            actual_end_at = NOW(),
            learner_count = COALESCE($3, learner_count),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Trip ID'), dto?.learner_count ?? dto?.learnerCount ?? null],
    );
    const trip = result.rows[0];
    if (!trip) throw new NotFoundException('Trip was not found in this school');
    await this.operations.recordAudit(tenantId, 'transport.trip_completed', 'transport_trip', trip.id, { trip, dto }, userId);
    return { success: true, message: 'Trip completed', trip };
  }

  async getFuelMaintenance() {
    const tenantId = this.requireTenantId();
    const [summary, fuel, maintenance] = await Promise.all([
      this.executeSql<{
        fuel_cost_this_month_minor: string;
        fuel_litres_this_month: string;
        maintenance_cost_this_month_minor: string;
        pending_maintenance: number;
        overdue_service: number;
      }>(
        `
          SELECT
            COALESCE((
              SELECT SUM(fuel_log.cost_minor)
              FROM vehicle_fuel_logs fuel_log
              WHERE fuel_log.tenant_id = $1
                AND fuel_log.fuel_date >= DATE_TRUNC('month', CURRENT_DATE)::date
            ), 0)::text AS fuel_cost_this_month_minor,
            COALESCE((
              SELECT SUM(fuel_log.litres)
              FROM vehicle_fuel_logs fuel_log
              WHERE fuel_log.tenant_id = $1
                AND fuel_log.fuel_date >= DATE_TRUNC('month', CURRENT_DATE)::date
            ), 0)::text AS fuel_litres_this_month,
            COALESCE((
              SELECT SUM(service_log.cost_minor)
              FROM vehicle_service_logs service_log
              WHERE service_log.tenant_id = $1
                AND service_log.service_date::date >= DATE_TRUNC('month', CURRENT_DATE)::date
            ), 0)::text AS maintenance_cost_this_month_minor,
            (SELECT COUNT(*)::int FROM transport_vehicles vehicle WHERE vehicle.tenant_id = $1 AND lower(vehicle.status::text) = 'maintenance') AS pending_maintenance,
            (
              SELECT COUNT(*)::int
              FROM transport_vehicles vehicle
              WHERE vehicle.tenant_id = $1
                AND lower(vehicle.status::text) = 'active'
                AND vehicle.service_due_date IS NOT NULL
                AND vehicle.service_due_date < CURRENT_DATE
            ) AS overdue_service
        `,
        [tenantId],
      ),
      this.executeSql<{
        id: string;
        vehicle_id: string;
        vehicle: string;
        type: string;
        description: string;
        litres: string;
        cost_minor: string;
        date: string;
        status: string;
      }>(
        `
          SELECT
            fuel_log.id::text,
            fuel_log.vehicle_id::text,
            vehicle.registration_number AS vehicle,
            'Fuel'::text AS type,
            TRIM(CONCAT_WS(' - ', NULLIF(fuel_log.station, ''), NULLIF(fuel_log.receipt_reference, ''))) AS description,
            fuel_log.litres::text,
            fuel_log.cost_minor::text,
            fuel_log.odometer_reading::text,
            fuel_log.station,
            fuel_log.receipt_reference,
            fuel_log.fuel_date::text AS date,
            fuel_log.fuel_date::text AS log_date,
            fuel_log.created_at::text,
            'Recorded'::text AS status
          FROM vehicle_fuel_logs fuel_log
          INNER JOIN transport_vehicles vehicle
            ON vehicle.tenant_id = fuel_log.tenant_id
           AND vehicle.id = fuel_log.vehicle_id
          WHERE fuel_log.tenant_id = $1
          ORDER BY fuel_log.fuel_date DESC, fuel_log.created_at DESC, fuel_log.id DESC
          LIMIT 200
        `,
        [tenantId],
      ),
      this.executeSql<{
        id: string;
        vehicle_id: string;
        vehicle: string;
        type: string;
        description: string;
        cost_minor: string;
        date: string;
        status: string;
      }>(
        `
          SELECT
            service_log.id::text,
            service_log.vehicle_id::text,
            vehicle.registration_number AS vehicle,
            'Maintenance'::text AS type,
            TRIM(CONCAT_WS(' - ', service_log.service_provider, service_log.notes)) AS description,
            service_log.cost_minor::text,
            service_log.service_date::text AS date,
            service_log.service_date::text AS log_date,
            service_log.created_at::text,
            'Completed'::text AS status
          FROM vehicle_service_logs service_log
          INNER JOIN transport_vehicles vehicle
            ON vehicle.tenant_id = service_log.tenant_id
           AND vehicle.id::text = service_log.vehicle_id::text
          WHERE service_log.tenant_id = $1
          ORDER BY service_log.service_date DESC, service_log.created_at DESC, service_log.id DESC
          LIMIT 200
        `,
        [tenantId],
      ),
    ]);
    const row = summary.rows[0] ?? {
      fuel_cost_this_month_minor: '0',
      fuel_litres_this_month: '0',
      maintenance_cost_this_month_minor: '0',
      pending_maintenance: 0,
      overdue_service: 0,
    };
    const fuelmaintenanceList = [...fuel.rows, ...maintenance.rows]
      .sort((left: any, right: any) => {
        const dateDifference = String(right.date ?? '').localeCompare(String(left.date ?? ''));
        if (dateDifference !== 0) return dateDifference;
        return String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''));
      })
      .slice(0, 200);
    return {
      metrics: {
        fuel_cost_this_month_minor: String(row.fuel_cost_this_month_minor || '0'),
        fuel_litres_this_month: String(row.fuel_litres_this_month || '0'),
        maintenance_cost_this_month_minor: String(row.maintenance_cost_this_month_minor || '0'),
        pending_maintenance: Number(row.pending_maintenance || 0),
        overdue_service: Number(row.overdue_service || 0),
      },
      fuelmaintenanceList,
      fuelLogs: fuel.rows,
      maintenanceLogs: maintenance.rows,
      data: fuelmaintenanceList,
    };
  }

  async logFuel(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireActorUserId();
    const actorRole = this.currentActorRole();
    const vehicleId = this.requireUuid(dto?.vehicle_id ?? dto?.vehicleId, 'Vehicle');
    const litres = Number(dto?.litres ?? dto?.liters ?? dto?.amount);
    if (!Number.isFinite(litres) || litres <= 0 || litres > 10000) {
      throw new BadRequestException('Fuel litres must be greater than zero and no more than 10,000');
    }
    const costMinor = this.costMinor(dto);
    const fuelDate = this.optionalDate(dto?.fuel_date ?? dto?.fuelDate ?? dto?.log_date ?? dto?.logDate, 'Fuel date');
    const odometerReading = this.optionalNonNegativeInteger(dto?.odometer_reading ?? dto?.odometerReading, 'Odometer reading');
    const station = this.optionalText(dto?.station, 180);
    const receiptReference = this.optionalText(dto?.receipt_reference ?? dto?.receiptReference, 120);
    const result = await this.operations.writeSql(
      `
        WITH selected_vehicle AS (
          SELECT vehicle.id, vehicle.tenant_id, vehicle.registration_number
          FROM transport_vehicles vehicle
          WHERE vehicle.tenant_id = $1
            AND vehicle.id = $2::uuid
            AND lower(vehicle.status::text) IN ('active', 'maintenance')
        ), inserted_log AS (
          INSERT INTO vehicle_fuel_logs (
            tenant_id, vehicle_id, fuel_date, litres, cost_minor, odometer_reading,
            station, receipt_reference, recorded_by_user_id
          )
          SELECT
            selected_vehicle.tenant_id,
            selected_vehicle.id,
            COALESCE($3::date, CURRENT_DATE),
            $4::numeric,
            $5::bigint,
            $6::integer,
            $7,
            $8,
            $9::uuid
          FROM selected_vehicle
          RETURNING *
        ), workflow_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            inserted_log.tenant_id,
            $9::uuid,
            $10,
            '["transport_manager","principal","accountant"]'::jsonb,
            'transport.fuel_logged',
            'vehicle_fuel_log',
            inserted_log.id::text,
            'Vehicle fuel recorded',
            CONCAT(inserted_log.litres::text, ' litre(s) recorded for ', selected_vehicle.registration_number, '.'),
            'normal',
            jsonb_build_object(
              'fuel_log_id', inserted_log.id::text,
              'vehicle_id', inserted_log.vehicle_id::text,
              'registration_number', selected_vehicle.registration_number,
              'fuel_date', inserted_log.fuel_date::text,
              'litres', inserted_log.litres,
              'cost_minor', inserted_log.cost_minor,
              'source_dashboard', 'transport-manager',
              'correlation_id', NULLIF(current_setting('app.request_id', true), '')
            )
          FROM inserted_log
          INNER JOIN selected_vehicle ON selected_vehicle.id = inserted_log.vehicle_id
          RETURNING id
        ), mutation_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            inserted_log.tenant_id,
            $9::uuid,
            current_setting('app.request_id', true),
            'transport.fuel_logged',
            'vehicle_fuel_log',
            inserted_log.id,
            jsonb_build_object(
              'vehicle_id', inserted_log.vehicle_id::text,
              'fuel_date', inserted_log.fuel_date::text,
              'litres', inserted_log.litres,
              'cost_minor', inserted_log.cost_minor
            )
          FROM inserted_log
          RETURNING id
        ), role_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body,
            status, priority, source_module, source_record_id, metadata
          )
          SELECT
            inserted_log.tenant_id,
            CONCAT('transport:fuel:', inserted_log.id::text, ':', recipient.role_name),
            recipient.role_name,
            'transport.fuel_logged',
            'Fuel log recorded',
            CONCAT(inserted_log.litres::text, ' litre(s) were recorded for ', selected_vehicle.registration_number, '.'),
            'unread',
            'normal',
            'transport',
            inserted_log.id::text,
            jsonb_build_object(
              'target_roles', jsonb_build_array(recipient.role_name),
              'vehicle_id', inserted_log.vehicle_id::text,
              'fuel_log_id', inserted_log.id::text,
              'source_dashboard', 'transport-manager'
            )
          FROM inserted_log
          INNER JOIN selected_vehicle ON selected_vehicle.id = inserted_log.vehicle_id
          CROSS JOIN unnest(ARRAY['transport_manager', 'principal', 'accountant']::text[]) AS recipient(role_name)
          WHERE TRUE
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        )
        SELECT
          inserted_log.id::text,
          inserted_log.vehicle_id::text,
          selected_vehicle.registration_number AS vehicle,
          inserted_log.fuel_date::text AS fuel_date,
          inserted_log.fuel_date::text AS date,
          inserted_log.litres::text,
          inserted_log.cost_minor::text,
          inserted_log.odometer_reading::text,
          inserted_log.station,
          inserted_log.receipt_reference,
          inserted_log.created_at::text,
          'Fuel'::text AS type,
          'Recorded'::text AS status,
          (SELECT id::text FROM workflow_event LIMIT 1) AS workflow_event_id,
          (SELECT COUNT(*)::int FROM mutation_audit) AS audits_created,
          (SELECT COUNT(*)::int FROM role_notifications) AS notifications_created
        FROM inserted_log
        INNER JOIN selected_vehicle ON selected_vehicle.id = inserted_log.vehicle_id
      `,
      [tenantId, vehicleId, fuelDate, litres, costMinor, odometerReading, station, receiptReference, userId, actorRole],
    );
    const log = result.rows[0];
    if (!log) throw new NotFoundException('An active vehicle was not found in this school');
    return { success: true, message: 'Fuel log recorded', fuelLog: log, log };
  }

  async logMaintenance(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireActorUserId();
    const actorRole = this.currentActorRole();
    const vehicleId = this.requireUuid(dto?.vehicle_id ?? dto?.vehicleId, 'Vehicle');
    const description = this.operations.requiredText(dto?.notes ?? dto?.description, 'Maintenance notes').slice(0, 2000);
    const serviceDate = this.optionalDate(dto?.service_date ?? dto?.serviceDate ?? dto?.log_date ?? dto?.logDate, 'Service date');
    const nextServiceDate = this.optionalDate(dto?.next_service_date ?? dto?.nextServiceDate, 'Next service date');
    if (serviceDate && nextServiceDate && nextServiceDate < serviceDate) {
      throw new BadRequestException('Next service date cannot be before the service date');
    }
    const costMinor = this.costMinor(dto);
    const odometerReading = this.optionalNonNegativeInteger(dto?.odometer_reading ?? dto?.odometerReading, 'Odometer reading');
    const serviceProvider = this.optionalText(dto?.service_provider ?? dto?.serviceProvider, 180);
    const requestedPriority = String(dto?.priority ?? 'normal').trim().toLowerCase();
    const priority = ['low', 'normal', 'medium', 'high', 'critical'].includes(requestedPriority)
      ? requestedPriority
      : 'normal';
    const eventPriority = priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : 'normal';
    const result = await this.operations.writeSql(
      `
        WITH selected_vehicle AS (
          SELECT vehicle.id, vehicle.tenant_id, vehicle.registration_number
          FROM transport_vehicles vehicle
          WHERE vehicle.tenant_id = $1
            AND vehicle.id = $2::uuid
            AND lower(vehicle.status::text) IN ('active', 'maintenance')
        ), inserted_log AS (
          INSERT INTO vehicle_service_logs (
            tenant_id, vehicle_id, service_date, odometer_reading, next_service_date,
            cost_minor, service_provider, notes, recorded_by_user_id
          )
          SELECT
            selected_vehicle.tenant_id,
            selected_vehicle.id,
            COALESCE($3::date, CURRENT_DATE),
            $4::integer,
            $5::date,
            $6::bigint,
            $7,
            $8,
            $9::uuid
          FROM selected_vehicle
          RETURNING *
        ), updated_vehicle AS (
          UPDATE transport_vehicles vehicle
          SET service_due_date = inserted_log.next_service_date,
              updated_at = NOW()
          FROM inserted_log
          WHERE vehicle.tenant_id = inserted_log.tenant_id
            AND vehicle.id = inserted_log.vehicle_id
            AND inserted_log.next_service_date IS NOT NULL
          RETURNING vehicle.id
        ), workflow_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            inserted_log.tenant_id,
            $9::uuid,
            $12,
            '["transport_manager","principal","accountant"]'::jsonb,
            'transport.maintenance_logged',
            'vehicle_service_log',
            inserted_log.id::text,
            'Vehicle maintenance recorded',
            CONCAT('Maintenance was recorded for ', selected_vehicle.registration_number, '.'),
            $10,
            jsonb_build_object(
              'service_log_id', inserted_log.id::text,
              'vehicle_id', inserted_log.vehicle_id::text,
              'registration_number', selected_vehicle.registration_number,
              'service_date', inserted_log.service_date::text,
              'next_service_date', inserted_log.next_service_date::text,
              'cost_minor', inserted_log.cost_minor,
              'priority', $11,
              'source_dashboard', 'transport-manager',
              'correlation_id', NULLIF(current_setting('app.request_id', true), '')
            )
          FROM inserted_log
          INNER JOIN selected_vehicle ON selected_vehicle.id = inserted_log.vehicle_id
          RETURNING id
        ), mutation_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            inserted_log.tenant_id,
            $9::uuid,
            current_setting('app.request_id', true),
            'transport.maintenance_logged',
            'vehicle_service_log',
            inserted_log.id,
            jsonb_build_object(
              'vehicle_id', inserted_log.vehicle_id::text,
              'service_date', inserted_log.service_date::text,
              'next_service_date', inserted_log.next_service_date::text,
              'cost_minor', inserted_log.cost_minor,
              'priority', $11
            )
          FROM inserted_log
          RETURNING id
        ), role_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body,
            status, priority, source_module, source_record_id, metadata
          )
          SELECT
            inserted_log.tenant_id,
            CONCAT('transport:maintenance:', inserted_log.id::text, ':', recipient.role_name),
            recipient.role_name,
            'transport.maintenance_logged',
            'Vehicle maintenance recorded',
            CONCAT('Maintenance was recorded for ', selected_vehicle.registration_number, '.'),
            'unread',
            $10,
            'transport',
            inserted_log.id::text,
            jsonb_build_object(
              'target_roles', jsonb_build_array(recipient.role_name),
              'vehicle_id', inserted_log.vehicle_id::text,
              'service_log_id', inserted_log.id::text,
              'priority', $11,
              'source_dashboard', 'transport-manager'
            )
          FROM inserted_log
          INNER JOIN selected_vehicle ON selected_vehicle.id = inserted_log.vehicle_id
          CROSS JOIN unnest(ARRAY['transport_manager', 'principal', 'accountant']::text[]) AS recipient(role_name)
          WHERE TRUE
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        )
        SELECT
          inserted_log.id::text,
          inserted_log.vehicle_id::text,
          selected_vehicle.registration_number AS vehicle,
          inserted_log.service_date::text AS service_date,
          inserted_log.service_date::text AS date,
          inserted_log.next_service_date::text,
          inserted_log.cost_minor::text,
          inserted_log.odometer_reading::text,
          inserted_log.service_provider,
          inserted_log.notes AS description,
          inserted_log.created_at::text,
          'Maintenance'::text AS type,
          'Completed'::text AS status,
          (SELECT id::text FROM workflow_event LIMIT 1) AS workflow_event_id,
          (SELECT COUNT(*)::int FROM mutation_audit) AS audits_created,
          (SELECT COUNT(*)::int FROM role_notifications) AS notifications_created
        FROM inserted_log
        INNER JOIN selected_vehicle ON selected_vehicle.id = inserted_log.vehicle_id
      `,
      [
        tenantId,
        vehicleId,
        serviceDate,
        odometerReading,
        nextServiceDate,
        costMinor,
        serviceProvider,
        description,
        userId,
        eventPriority,
        priority,
        actorRole,
      ],
    );
    const log = result.rows[0];
    if (!log) throw new NotFoundException('An active vehicle was not found in this school');
    return { success: true, message: 'Maintenance service recorded', maintenanceLog: log, log };
  }

  async getStudentTransportList() {
    const tenantId = this.requireTenantId();
    const [summary, assignments] = await Promise.all([
      this.executeSql<{ students_assigned: number; unassigned: number }>(
        `
          SELECT
            (
              SELECT COUNT(DISTINCT manifest_student.student_id)::int
              FROM transport_manifest_students manifest_student
              INNER JOIN transport_manifests manifest
                ON manifest.tenant_id = manifest_student.tenant_id
               AND manifest.id::text = manifest_student.manifest_id::text
              WHERE manifest_student.tenant_id = $1
                AND manifest_student.boarding_status = 'active'
                AND manifest.status = 'active'
            ) AS students_assigned,
            (
              SELECT COUNT(*)::int
              FROM students student
              WHERE student.tenant_id = $1
                AND student.deleted_at IS NULL
                AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
                AND NOT EXISTS (
                  SELECT 1
                  FROM transport_manifest_students manifest_student
                  INNER JOIN transport_manifests manifest
                    ON manifest.tenant_id = manifest_student.tenant_id
                   AND manifest.id::text = manifest_student.manifest_id::text
                  WHERE manifest_student.tenant_id = student.tenant_id
                    AND manifest_student.student_id::text = student.id::text
                    AND manifest_student.boarding_status = 'active'
                    AND manifest.status = 'active'
                )
            ) AS unassigned
        `,
        [tenantId],
      ),
      this.executeSql<{
        id: string;
        student_name: string;
        class: string;
        route: string;
        pickup_point: string;
        guardian_phone: string;
        status: string;
      }>(
        `
          SELECT
            manifest_student.id::text,
            manifest_student.student_id::text,
            manifest_student.manifest_id::text,
            manifest_student.pickup_stop_id::text,
            student.admission_number,
            TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            COALESCE(current_allocation.class_name, student.current_class_id, '') AS class,
            route.name AS route,
            route.name AS route_name,
            COALESCE(pickup_stop.name, '') AS pickup_point,
            COALESCE(pickup_stop.name, '') AS pickup_stop_name,
            COALESCE(manifest_student.guardian_contact, student.primary_guardian_phone, '') AS guardian_phone,
            COALESCE(manifest_student.guardian_contact, student.primary_guardian_phone, '') AS guardian_contact,
            manifest_student.boarding_status,
            INITCAP(REPLACE(manifest_student.boarding_status, '_', ' ')) AS status
          FROM transport_manifest_students manifest_student
          INNER JOIN transport_manifests manifest
            ON manifest.tenant_id = manifest_student.tenant_id
           AND manifest.id::text = manifest_student.manifest_id::text
          INNER JOIN transport_routes route
            ON route.tenant_id = manifest.tenant_id
           AND route.id::text = manifest.route_id::text
          INNER JOIN students student
            ON student.tenant_id = manifest_student.tenant_id
           AND student.id::text = manifest_student.student_id::text
          LEFT JOIN transport_route_stops pickup_stop
            ON pickup_stop.tenant_id = manifest_student.tenant_id
           AND pickup_stop.id::text = manifest_student.pickup_stop_id::text
          LEFT JOIN LATERAL (
            SELECT allocation.class_name
            FROM student_allocations allocation
            WHERE allocation.tenant_id = student.tenant_id
              AND allocation.student_id::text = student.id::text
              AND allocation.is_current = TRUE
            ORDER BY allocation.effective_from DESC, allocation.created_at DESC
            LIMIT 1
          ) current_allocation ON TRUE
          WHERE manifest_student.tenant_id = $1
          ORDER BY student.last_name ASC, student.first_name ASC, student.admission_number ASC
          LIMIT 500
        `,
        [tenantId],
      ),
    ]);
    const row = summary.rows[0] ?? { students_assigned: 0, unassigned: 0 };
    return {
      metrics: {
        students_assigned: Number(row.students_assigned || 0),
        unassigned: Number(row.unassigned || 0),
      },
      studenttransportlistList: assignments.rows,
      data: assignments.rows,
    };
  }

  async assignStudentTransport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireActorUserId();
    const actorRole = this.currentActorRole();
    const requestedManifestId = dto?.manifest_id ?? dto?.manifestId;
    const hasManifestId = requestedManifestId !== undefined
      && requestedManifestId !== null
      && Boolean(String(requestedManifestId).trim());
    const manifestId = hasManifestId
      ? this.requireUuid(requestedManifestId, 'Transport manifest')
      : null;
    const routeId = manifestId
      ? null
      : this.requireUuid(dto?.route_id ?? dto?.routeId, 'Transport route');
    const studentId = this.requireUuid(dto?.student_id ?? dto?.studentId, 'Student');
    const pickupStopId = dto?.pickup_stop_id ?? dto?.pickupStopId
      ? this.requireUuid(dto?.pickup_stop_id ?? dto?.pickupStopId, 'Pickup stop')
      : null;
    const dropoffStopId = dto?.dropoff_stop_id ?? dto?.dropoffStopId
      ? this.requireUuid(dto?.dropoff_stop_id ?? dto?.dropoffStopId, 'Drop-off stop')
      : null;
    const result = await this.operations.writeSql(
      `
        WITH selected_student AS (
          SELECT student.id, student.tenant_id
          FROM students student
          WHERE student.tenant_id = $1
            AND student.id = $4::uuid
            AND student.deleted_at IS NULL
            AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
        ), selected_manifest AS (
          SELECT manifest.id, manifest.tenant_id, manifest.route_id
          FROM transport_manifests manifest
          INNER JOIN transport_routes route
            ON route.tenant_id = manifest.tenant_id
           AND route.id = manifest.route_id
          WHERE manifest.tenant_id = $1
            AND manifest.id = $2::uuid
            AND $2::uuid IS NOT NULL
            AND manifest.status = 'active'
            AND lower(route.status::text) = 'active'
        ), selected_route AS (
          SELECT route.id, route.tenant_id
          FROM transport_routes route
          WHERE route.tenant_id = $1
            AND route.id = $3::uuid
            AND $2::uuid IS NULL
            AND lower(route.status::text) = 'active'
        ), candidate_route AS (
          SELECT selected_manifest.tenant_id, selected_manifest.route_id
          FROM selected_manifest
          UNION ALL
          SELECT selected_route.tenant_id, selected_route.id AS route_id
          FROM selected_route
        ), route_manifest AS (
          SELECT
            active_manifest.id,
            selected_route.tenant_id,
            selected_route.id AS route_id
          FROM selected_route
          INNER JOIN LATERAL (
            SELECT manifest.id
            FROM transport_manifests manifest
            WHERE manifest.tenant_id = selected_route.tenant_id
              AND manifest.route_id = selected_route.id
              AND manifest.status = 'active'
            ORDER BY manifest.effective_from DESC, manifest.created_at DESC, manifest.id DESC
            LIMIT 1
          ) active_manifest ON TRUE
        ), validated_references AS (
          SELECT
            candidate_route.tenant_id,
            candidate_route.route_id,
            selected_student.id AS student_id,
            pickup_stop.id AS pickup_stop_id,
            dropoff_stop.id AS dropoff_stop_id
          FROM candidate_route
          CROSS JOIN selected_student
          LEFT JOIN transport_route_stops pickup_stop
            ON pickup_stop.tenant_id = candidate_route.tenant_id
           AND pickup_stop.route_id = candidate_route.route_id
           AND pickup_stop.id = $5::uuid
           AND pickup_stop.is_active = TRUE
          LEFT JOIN transport_route_stops dropoff_stop
            ON dropoff_stop.tenant_id = candidate_route.tenant_id
           AND dropoff_stop.route_id = candidate_route.route_id
           AND dropoff_stop.id = $6::uuid
           AND dropoff_stop.is_active = TRUE
          WHERE ($5::uuid IS NULL OR pickup_stop.id IS NOT NULL)
            AND ($6::uuid IS NULL OR dropoff_stop.id IS NOT NULL)
        ), created_manifest AS (
          INSERT INTO transport_manifests (tenant_id, route_id, status, created_by_user_id)
          SELECT
            validated_references.tenant_id,
            validated_references.route_id,
            'active',
            $9::uuid
          FROM validated_references
          WHERE $2::uuid IS NULL
            AND NOT EXISTS (SELECT 1 FROM route_manifest)
          RETURNING id, tenant_id, route_id
        ), resolved_manifest AS (
          SELECT selected_manifest.id, selected_manifest.tenant_id, selected_manifest.route_id
          FROM selected_manifest
          UNION ALL
          SELECT route_manifest.id, route_manifest.tenant_id, route_manifest.route_id
          FROM route_manifest
          UNION ALL
          SELECT created_manifest.id, created_manifest.tenant_id, created_manifest.route_id
          FROM created_manifest
        ), validated_assignment AS (
          SELECT
            resolved_manifest.tenant_id,
            resolved_manifest.id AS manifest_id,
            resolved_manifest.route_id,
            validated_references.student_id,
            validated_references.pickup_stop_id,
            validated_references.dropoff_stop_id
          FROM resolved_manifest
          INNER JOIN validated_references
            ON validated_references.tenant_id = resolved_manifest.tenant_id
           AND validated_references.route_id = resolved_manifest.route_id
        ), inserted_assignment AS (
          INSERT INTO transport_manifest_students (
            tenant_id, manifest_id, student_id, pickup_stop_id, dropoff_stop_id,
            guardian_contact, notes
          )
          SELECT
            validated_assignment.tenant_id,
            validated_assignment.manifest_id,
            validated_assignment.student_id,
            validated_assignment.pickup_stop_id,
            validated_assignment.dropoff_stop_id,
            $7,
            $8
          FROM validated_assignment
          WHERE TRUE
          ON CONFLICT (tenant_id, manifest_id, student_id)
          DO UPDATE SET
            boarding_status = 'active',
            pickup_stop_id = EXCLUDED.pickup_stop_id,
            dropoff_stop_id = EXCLUDED.dropoff_stop_id,
            guardian_contact = EXCLUDED.guardian_contact,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING *
        ), workflow_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            inserted_assignment.tenant_id,
            $9::uuid,
            $10,
            '["transport_manager","principal","accountant"]'::jsonb,
            'transport.student_assigned',
            'transport_manifest_student',
            inserted_assignment.id::text,
            'Student assigned to transport route',
            'A student transport assignment was created or reactivated.',
            'normal',
            jsonb_build_object(
              'assignment_id', inserted_assignment.id::text,
              'manifest_id', inserted_assignment.manifest_id::text,
              'student_id', inserted_assignment.student_id::text,
              'route_id', validated_assignment.route_id::text,
              'source_dashboard', 'transport-manager',
              'correlation_id', NULLIF(current_setting('app.request_id', true), '')
            )
          FROM inserted_assignment
          INNER JOIN validated_assignment
            ON validated_assignment.manifest_id = inserted_assignment.manifest_id
           AND validated_assignment.student_id = inserted_assignment.student_id
          RETURNING id
        ), mutation_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            inserted_assignment.tenant_id,
            $9::uuid,
            current_setting('app.request_id', true),
            'transport.student_assigned',
            'transport_manifest_student',
            inserted_assignment.id,
            jsonb_build_object(
              'manifest_id', inserted_assignment.manifest_id::text,
              'student_id', inserted_assignment.student_id::text,
              'route_id', validated_assignment.route_id::text
            )
          FROM inserted_assignment
          INNER JOIN validated_assignment
            ON validated_assignment.manifest_id = inserted_assignment.manifest_id
           AND validated_assignment.student_id = inserted_assignment.student_id
          RETURNING id
        ), role_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body,
            status, priority, source_module, source_record_id, metadata
          )
          SELECT
            inserted_assignment.tenant_id,
            CONCAT('transport:student-assigned:', workflow_event.id::text, ':', recipient.role_name),
            recipient.role_name,
            'transport.student_assigned',
            'Student transport assignment updated',
            'A student was assigned to an active school transport route.',
            'unread',
            'normal',
            'transport',
            inserted_assignment.id::text,
            jsonb_build_object(
              'target_roles', jsonb_build_array(recipient.role_name),
              'assignment_id', inserted_assignment.id::text,
              'manifest_id', inserted_assignment.manifest_id::text,
              'student_id', inserted_assignment.student_id::text,
              'route_id', validated_assignment.route_id::text,
              'workflow_event_id', workflow_event.id::text,
              'source_dashboard', 'transport-manager'
            )
          FROM inserted_assignment
          INNER JOIN validated_assignment
            ON validated_assignment.manifest_id = inserted_assignment.manifest_id
           AND validated_assignment.student_id = inserted_assignment.student_id
          CROSS JOIN workflow_event
          CROSS JOIN unnest(ARRAY['transport_manager', 'principal', 'accountant']::text[]) AS recipient(role_name)
          WHERE TRUE
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        )
        SELECT
          inserted_assignment.*,
          validated_assignment.route_id::text,
          (SELECT id::text FROM workflow_event LIMIT 1) AS workflow_event_id,
          (SELECT COUNT(*)::int FROM mutation_audit) AS audits_created,
          (SELECT COUNT(*)::int FROM role_notifications) AS notifications_created
        FROM inserted_assignment
        INNER JOIN validated_assignment
          ON validated_assignment.manifest_id = inserted_assignment.manifest_id
         AND validated_assignment.student_id = inserted_assignment.student_id
      `,
      [
        tenantId,
        manifestId,
        routeId,
        studentId,
        pickupStopId,
        dropoffStopId,
        dto?.guardian_contact ?? dto?.guardianContact ?? null,
        dto?.notes ?? null,
        userId,
        actorRole,
      ],
    );
    const assignment = result.rows[0];
    if (!assignment) {
      throw new NotFoundException('Active transport assignment records were not found in this school');
    }
    return { success: true, message: 'Student transport assigned', assignment };
  }

  async removeStudentTransport(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        UPDATE transport_manifest_students
        SET boarding_status = 'left_route', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Student transport assignment ID')],
    );
    const assignment = result.rows[0];
    if (!assignment) throw new NotFoundException('Student transport assignment was not found in this school');
    await this.operations.recordAudit(tenantId, 'transport.student_removed', 'transport_manifest_student', assignment.id, { assignment }, userId);
    return { success: true, message: 'Student removed from transport route', assignment };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const snapshots = await this.operations.listReportSnapshots(tenantId, 'transport-manager-command');
    const reportsList = snapshots.map((snapshot: any) => ({
      id: String(snapshot.id),
      title: String(snapshot.reportName ?? ''),
      generated_at: String(snapshot.generatedDate ?? ''),
      type: String(snapshot.type ?? ''),
      status: String(snapshot.status ?? ''),
    }));
    return {
      metrics: { reports_generated: reportsList.length },
      reportsList,
      data: reportsList,
    };
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const [overview, vehicles, drivers, routes, trips, fuelMaintenance, studentTransportList] = await Promise.all([
      this.getOverview(),
      this.getVehicles(),
      this.getDrivers(),
      this.getRoutes(),
      this.getTrips(),
      this.getFuelMaintenance(),
      this.getStudentTransportList(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'transport-manager-command',
      reportId: 'transport-operations',
      title: String(dto?.name || dto?.title || 'Transport operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, vehicles, drivers, routes, trips, fuelMaintenance, studentTransportList },
      filters: { requested_from: 'transport-manager-dashboard' },
      targetRoles: ['principal', 'transport_manager'],
    });
  }

  async recordAction(dto: any) {
    const tenantId = this.requireTenantId();
    const action = this.operations.requiredText(dto?.action, 'Transport action');
    const title = String(dto?.title || `Transport: ${action.replace(/[-_.]+/g, ' ')}`).trim();
    const message = String(dto?.description || dto?.message || title).trim();
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.currentUserId(),
      sourceRole: 'transport_manager',
      targetRoles: ['transport_manager', 'principal', 'deputy_principal', 'accountant'],
      eventType: `transport.${action}`,
      entityType: String(dto?.entityType || 'transport_workflow'),
      entityId: dto?.entityId ?? dto?.entity_id ?? null,
      title,
      message,
      priority: dto?.priority === 'high' || dto?.priority === 'urgent' ? 'high' : 'normal',
      payload: {
        ...dto,
        source_dashboard: 'transport-manager-dashboard',
      },
    });
  }

  async getNotices() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      id: string;
      title: string;
      notice_type: string;
      scope: string;
      channels: string[];
      delivery_status: string;
      targeted_students: number;
      sms_queued: number;
      sms_processing: number;
      sms_provider_accepted: number;
      sms_needs_review: number;
      in_app_notifications_created: number;
      created_at: string;
    }>(
      `
        SELECT
          event.id::text,
          event.title,
          COALESCE(NULLIF(event.payload ->> 'notice_type', ''), 'general') AS notice_type,
          CASE
            WHEN route.id IS NOT NULL THEN route.name
            ELSE CONCAT(
              COALESCE(NULLIF(event.payload ->> 'targeted_students', '')::int, 0),
              ' selected student assignment(s)'
            )
          END AS scope,
          COALESCE(event.payload -> 'channels', '[]'::jsonb) AS channels,
          COALESCE(NULLIF(event.payload ->> 'delivery_status', ''), event.status) AS delivery_status,
          COALESCE(NULLIF(event.payload ->> 'targeted_students', '')::int, 0) AS targeted_students,
          COALESCE(NULLIF(event.payload ->> 'sms_queued', '')::int, 0) AS sms_queued,
          COALESCE(NULLIF(event.payload ->> 'sms_processing', '')::int, 0) AS sms_processing,
          COALESCE(NULLIF(event.payload ->> 'sms_provider_accepted', '')::int, 0) AS sms_provider_accepted,
          COALESCE(NULLIF(event.payload ->> 'sms_needs_review', '')::int, 0) AS sms_needs_review,
          COALESCE(NULLIF(event.payload ->> 'in_app_notifications_created', '')::int, 0) AS in_app_notifications_created,
          event.created_at::text
        FROM workflow_events event
        LEFT JOIN transport_routes route
          ON route.tenant_id = event.tenant_id
         AND route.id::text = event.payload ->> 'route_id'
        WHERE event.tenant_id = $1
          AND event.event_type = 'transport.notice_queued'
        ORDER BY event.created_at DESC, event.id DESC
        LIMIT 200
      `,
      [tenantId],
    );

    return {
      metrics: {
        notices_recorded: result.rows.length,
        sms_queued: result.rows.reduce((total, notice) => total + Number(notice.sms_queued || 0), 0),
        sms_processing: result.rows.reduce((total, notice) => total + Number(notice.sms_processing || 0), 0),
        sms_provider_accepted: result.rows.reduce(
          (total, notice) => total + Number(notice.sms_provider_accepted || 0),
          0,
        ),
        sms_needs_review: result.rows.reduce(
          (total, notice) => total + Number(notice.sms_needs_review || 0),
          0,
        ),
        in_app_notifications_created: result.rows.reduce(
          (total, notice) => total + Number(notice.in_app_notifications_created || 0),
          0,
        ),
      },
      noticesList: result.rows,
      data: result.rows,
    };
  }

  async getIncidents() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      id: string;
      date: string;
      vehicle: string;
      driver: string;
      type: string;
      severity: string;
      status: string;
      description: string;
    }>(
      `
        WITH incident_rows AS (
          SELECT
            trip_event.id::text,
            trip_event.event_time AS occurred_at,
            vehicle.registration_number AS vehicle,
            COALESCE(driver.name, '') AS driver,
            INITCAP(REPLACE(trip_event.event_type, '_', ' ')) AS type,
            INITCAP(COALESCE(NULLIF(trip_event.metadata ->> 'severity', ''), 'warning')) AS severity,
            CASE
              WHEN trip.status = 'completed' THEN 'Resolved'
              WHEN trip.status = 'cancelled' THEN 'Closed'
              ELSE 'Open'
            END AS status,
            COALESCE(trip_event.notes, '') AS description
          FROM transport_trip_events trip_event
          INNER JOIN transport_trips trip
            ON trip.tenant_id = trip_event.tenant_id
           AND trip.id::text = trip_event.trip_id::text
          INNER JOIN transport_vehicles vehicle
            ON vehicle.tenant_id = trip.tenant_id
           AND vehicle.id::text = trip.vehicle_id::text
          LEFT JOIN transport_drivers driver
            ON driver.tenant_id = trip.tenant_id
           AND driver.id::text = trip.driver_id::text
          WHERE trip_event.tenant_id = $1
            AND trip_event.event_type IN ('delay', 'incident')

          UNION ALL

          SELECT
            alert.id::text,
            alert.created_at AS occurred_at,
            COALESCE(vehicle.registration_number, '') AS vehicle,
            ''::text AS driver,
            alert.title AS type,
            INITCAP(alert.severity) AS severity,
            INITCAP(alert.status) AS status,
            alert.message AS description
          FROM transport_alerts alert
          LEFT JOIN transport_vehicles vehicle
            ON vehicle.tenant_id = alert.tenant_id
           AND vehicle.id::text = alert.vehicle_id::text
          WHERE alert.tenant_id = $1
        )
        SELECT
          incident.id,
          incident.occurred_at::text AS date,
          incident.vehicle,
          incident.driver,
          incident.type,
          incident.severity,
          incident.status,
          incident.description
        FROM incident_rows incident
        ORDER BY incident.occurred_at DESC, incident.id DESC
        LIMIT 200
      `,
      [tenantId],
    );

    return {
      metrics: {
        incidents_recorded: result.rows.length,
        open: result.rows.filter((incident) => incident.status.toLowerCase() === 'open').length,
        critical: result.rows.filter((incident) => incident.severity.toLowerCase() === 'critical').length,
      },
      incidentsList: result.rows,
      data: result.rows,
    };
  }

  async sendNotice(dto: any) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireActorUserId();
    const actorRole = this.currentActorRole();
    const title = this.operations.requiredText(dto?.title, 'Transport notice title');
    const message = this.operations.requiredText(dto?.message || dto?.body, 'Transport notice message');
    const noticeType = String(dto?.notice_type || 'general').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_') || 'general';
    const routeId = dto?.route_id ?? dto?.routeId
      ? this.requireUuid(dto?.route_id ?? dto?.routeId, 'Route')
      : null;
    const requestedStudentIds = Array.isArray(dto?.student_ids ?? dto?.studentIds)
      ? (dto?.student_ids ?? dto?.studentIds)
      : [dto?.student_id ?? dto?.studentId].filter(Boolean);
    const studentIds = [...new Set(requestedStudentIds.map((value: unknown) => this.requireUuid(value, 'Student')))];
    if (!routeId && studentIds.length === 0) {
      throw new BadRequestException('Select a transport route or student before queuing a guardian notice');
    }
    if (studentIds.length > 500) {
      throw new BadRequestException('A transport notice can target at most 500 selected students');
    }

    const requestedChannels = Array.isArray(dto?.channels) ? dto.channels : ['in_app'];
    const channels = [...new Set(
      requestedChannels
        .map((channel: unknown) => String(channel).trim().toLowerCase())
        .filter((channel: string) => channel === 'in_app' || channel === 'sms'),
    )];
    if (channels.length === 0) {
      throw new BadRequestException('Select in-app notification or SMS queue delivery');
    }
    const priority = dto?.priority === 'high' || dto?.priority === 'urgent' ? 'high' : 'normal';

    const result = await this.operations.writeSql<{
      id: string;
      targeted_students: number;
      sms_queued: number;
      sms_processing: number;
      sms_provider_accepted: number;
      sms_needs_review: number;
      sms_outbox_count: number;
      in_app_notifications_created: number;
      delivery_status: 'queued' | 'degraded' | 'processing' | 'provider_accepted';
      workflow_status: string;
      audits_created: number;
    }>(
      `
        WITH selected_assignments AS (
          SELECT DISTINCT
            manifest_student.student_id,
            manifest.route_id,
            COALESCE(
              NULLIF(BTRIM(manifest_student.guardian_contact), ''),
              NULLIF(BTRIM(student.primary_guardian_phone), '')
            ) AS assignment_phone
          FROM transport_manifest_students manifest_student
          INNER JOIN transport_manifests manifest
            ON manifest.tenant_id = manifest_student.tenant_id
           AND manifest.id = manifest_student.manifest_id
           AND manifest.status = 'active'
          INNER JOIN transport_routes route
            ON route.tenant_id = manifest.tenant_id
           AND route.id = manifest.route_id
           AND lower(route.status::text) = 'active'
          INNER JOIN students student
            ON student.tenant_id = manifest_student.tenant_id
           AND student.id = manifest_student.student_id
           AND student.deleted_at IS NULL
          WHERE manifest_student.tenant_id = $1
            AND manifest_student.boarding_status = 'active'
            AND ($2::uuid IS NULL OR manifest.route_id = $2::uuid)
            AND (CARDINALITY($3::uuid[]) = 0 OR manifest_student.student_id = ANY($3::uuid[]))
        ), recipient_contacts AS (
          SELECT DISTINCT
            assignment.student_id,
            assignment.route_id,
            guardian.id AS guardian_id,
            guardian.user_id,
            COALESCE(NULLIF(BTRIM(guardian.phone), ''), assignment.assignment_phone) AS phone,
            COALESCE(guardian.can_receive_sms, true) AS can_receive_sms
          FROM selected_assignments assignment
          LEFT JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id::text = assignment.student_id::text
           AND COALESCE(guardian.status, 'active') <> 'revoked'
        ), in_app_contacts AS (
          SELECT
            contact.guardian_id,
            contact.user_id,
            MIN(contact.student_id) AS student_id
          FROM recipient_contacts contact
          WHERE contact.guardian_id IS NOT NULL OR contact.user_id IS NOT NULL
          GROUP BY contact.guardian_id, contact.user_id
        ), sms_contacts AS (
          SELECT
            contact.phone,
            MIN(COALESCE(
              contact.guardian_id::text,
              contact.user_id::text,
              contact.student_id::text
            )) AS recipient_identity
          FROM recipient_contacts contact
          WHERE contact.can_receive_sms
            AND contact.phone IS NOT NULL
            AND BTRIM(contact.phone) <> ''
          GROUP BY contact.phone
        ), delivery_counts AS (
          SELECT
            (SELECT COUNT(DISTINCT assignment.student_id)::int FROM selected_assignments assignment) AS targeted_students,
            (SELECT COUNT(*)::int FROM sms_contacts) AS sms_contacts,
            (SELECT COUNT(*)::int FROM in_app_contacts) AS in_app_contacts
        ), notice_identity AS (
          SELECT
            gen_random_uuid() AS id,
            counts.targeted_students,
            counts.sms_contacts,
            counts.in_app_contacts,
            CASE
              WHEN ('sms' = ANY($8::text[]) AND counts.sms_contacts = 0)
                OR ('in_app' = ANY($8::text[]) AND counts.in_app_contacts = 0)
              THEN 'degraded'
              ELSE 'queued'
            END AS delivery_status
          FROM delivery_counts counts
          WHERE counts.targeted_students > 0
            AND (
              ('sms' = ANY($8::text[]) AND counts.sms_contacts > 0)
              OR ('in_app' = ANY($8::text[]) AND counts.in_app_contacts > 0)
            )
        ), in_app_insert AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id, recipient_role,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            CONCAT(
              'transport:notice:', notice.id::text, ':',
              COALESCE(recipient.guardian_id::text, recipient.user_id::text)
            ),
            recipient.user_id,
            recipient.guardian_id,
            'parent',
            'transport.notice_queued',
            $4,
            $5,
            'unread',
            $7,
            'transport',
            notice.id::text,
            jsonb_build_object(
              'notice_id', notice.id::text,
              'notice_type', $6,
              'route_id', $2::text,
              'student_id', recipient.student_id::text,
              'source_dashboard', 'transport-manager-command-center'
            )
          FROM in_app_contacts recipient
          CROSS JOIN notice_identity notice
          WHERE 'in_app' = ANY($8::text[])
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        ), sms_insert AS (
          INSERT INTO communication_sms_outbox (
            tenant_id, recipient_phone, message, status, sent_by, updated_at, dispatch_key
          )
          SELECT
            $1,
            recipient.phone,
            $5,
            'Pending',
            $9::uuid,
            NOW(),
            'transport-notice:'
              || NULLIF(current_setting('app.request_id', true), '')
              || ':' || recipient.recipient_identity
          FROM sms_contacts recipient
          CROSS JOIN notice_identity notice
          WHERE 'sms' = ANY($8::text[])
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
          FROM sms_insert
        ), workflow_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload, status
          )
          SELECT
            $1,
            $9::uuid,
            $10,
            to_jsonb(ARRAY['transport_manager']::text[]),
            'transport.notice_queued',
            'transport_notice',
            notice.id::text,
            $4,
            $5,
            $7,
            jsonb_build_object(
              'notice_id', notice.id::text,
              'notice_type', $6,
              'route_id', $2::text,
              'student_ids', to_jsonb($3::uuid[]),
              'recipient_scope', 'linked_transport_guardians',
              'channels', to_jsonb($8::text[]),
              'targeted_students', notice.targeted_students,
              'sms_queued', (SELECT queued_count FROM sms_outcome),
              'sms_processing', (SELECT processing_count FROM sms_outcome),
              'sms_provider_accepted', (SELECT accepted_count FROM sms_outcome),
              'sms_needs_review', (SELECT needs_review_count FROM sms_outcome),
              'sms_outbox_count', (SELECT outbox_count FROM sms_outcome),
              'in_app_notifications_created', (SELECT COUNT(*)::int FROM in_app_insert),
              'delivery_status', CASE
                WHEN notice.delivery_status = 'degraded' OR (SELECT needs_review_count FROM sms_outcome) > 0 THEN 'degraded'
                WHEN (SELECT queued_count FROM sms_outcome) > 0 THEN 'queued'
                WHEN (SELECT processing_count FROM sms_outcome) > 0 THEN 'processing'
                WHEN (SELECT accepted_count FROM sms_outcome) > 0 THEN 'provider_accepted'
                ELSE notice.delivery_status
              END,
              'source_dashboard', 'transport-manager-command-center',
              'correlation_id', NULLIF(current_setting('app.request_id', true), '')
            ),
            CASE
              WHEN (SELECT needs_review_count FROM sms_outcome) > 0 THEN 'needs_review'
              WHEN (SELECT queued_count FROM sms_outcome) > 0 THEN 'pending'
              WHEN (SELECT processing_count FROM sms_outcome) > 0 THEN 'processing'
              WHEN (SELECT accepted_count FROM sms_outcome) > 0 THEN 'provider_accepted'
              ELSE 'completed'
            END
          FROM notice_identity notice
          RETURNING id, entity_id, status
        ), mutation_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $9::uuid,
            current_setting('app.request_id', true),
            'transport.notice_queued',
            'transport_notice',
            event.entity_id,
            jsonb_build_object(
              'workflow_event_id', event.id::text,
              'route_id', $2::text,
              'student_ids', to_jsonb($3::uuid[]),
              'channels', to_jsonb($8::text[]),
              'targeted_students', notice.targeted_students,
              'sms_queued', (SELECT queued_count FROM sms_outcome),
              'sms_processing', (SELECT processing_count FROM sms_outcome),
              'sms_provider_accepted', (SELECT accepted_count FROM sms_outcome),
              'sms_needs_review', (SELECT needs_review_count FROM sms_outcome),
              'sms_outbox_count', (SELECT outbox_count FROM sms_outcome),
              'in_app_notifications_created', (SELECT COUNT(*)::int FROM in_app_insert),
              'delivery_status', CASE
                WHEN notice.delivery_status = 'degraded' OR (SELECT needs_review_count FROM sms_outcome) > 0 THEN 'degraded'
                WHEN (SELECT queued_count FROM sms_outcome) > 0 THEN 'queued'
                WHEN (SELECT processing_count FROM sms_outcome) > 0 THEN 'processing'
                WHEN (SELECT accepted_count FROM sms_outcome) > 0 THEN 'provider_accepted'
                ELSE notice.delivery_status
              END
            )
          FROM workflow_event event
          CROSS JOIN notice_identity notice
          RETURNING id
        )
        SELECT
          event.id::text,
          notice.targeted_students,
          (SELECT queued_count FROM sms_outcome) AS sms_queued,
          (SELECT processing_count FROM sms_outcome) AS sms_processing,
          (SELECT accepted_count FROM sms_outcome) AS sms_provider_accepted,
          (SELECT needs_review_count FROM sms_outcome) AS sms_needs_review,
          (SELECT outbox_count FROM sms_outcome) AS sms_outbox_count,
          (SELECT COUNT(*)::int FROM in_app_insert) AS in_app_notifications_created,
          CASE
            WHEN notice.delivery_status = 'degraded' OR (SELECT needs_review_count FROM sms_outcome) > 0 THEN 'degraded'
            WHEN (SELECT queued_count FROM sms_outcome) > 0 THEN 'queued'
            WHEN (SELECT processing_count FROM sms_outcome) > 0 THEN 'processing'
            WHEN (SELECT accepted_count FROM sms_outcome) > 0 THEN 'provider_accepted'
            ELSE notice.delivery_status
          END AS delivery_status,
          event.status AS workflow_status,
          (SELECT COUNT(*)::int FROM mutation_audit) AS audits_created
        FROM workflow_event event
        CROSS JOIN notice_identity notice
      `,
      [
        tenantId,
        routeId,
        studentIds,
        title,
        message,
        noticeType,
        priority,
        channels,
        actorUserId,
        actorRole,
      ],
    );

    const notice = result.rows[0];
    if (!notice) {
      throw new BadRequestException(
        'No selected transport guardian has a deliverable in-app account or SMS contact in this school',
      );
    }

    return {
      success: true,
      status: notice.delivery_status,
      message: notice.delivery_status === 'degraded'
        ? 'Transport notice recorded with unavailable channels or SMS outcomes requiring delivery review'
        : notice.delivery_status === 'processing'
          ? 'Transport notice SMS dispatch is already in progress'
          : notice.delivery_status === 'provider_accepted'
            ? 'Transport notice SMS was already accepted by the configured provider'
            : 'Transport notice queued for selected transport guardians',
      targeted_students: Number(notice.targeted_students || 0),
      sms_queued: Number(notice.sms_queued || 0),
      sms_processing: Number(notice.sms_processing || 0),
      sms_provider_accepted: Number(notice.sms_provider_accepted || 0),
      sms_needs_review: Number(notice.sms_needs_review || 0),
      sms_outbox_count: Number(notice.sms_outbox_count || 0),
      in_app_notifications_created: Number(notice.in_app_notifications_created || 0),
      event: {
        id: notice.id,
        type: 'transport.notice_queued',
        status: notice.workflow_status,
      },
    };
  }
}
