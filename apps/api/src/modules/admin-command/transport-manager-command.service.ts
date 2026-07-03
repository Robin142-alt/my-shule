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
        (SELECT COUNT(*)::int FROM transport_vehicles WHERE tenant_id = $1) as "totalVehicles",
        (SELECT COUNT(*)::int FROM transport_drivers WHERE tenant_id = $1) as "totalDrivers",
        (SELECT COUNT(*)::int FROM transport_routes WHERE tenant_id = $1) as "totalRoutes",
        (SELECT COUNT(*)::int FROM transport_trips WHERE tenant_id = $1 AND trip_date = CURRENT_DATE) as "todayTrips"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalVehicles: 0, totalDrivers: 0, totalRoutes: 0, todayTrips: 0 };
    return {
      metrics: {
        totalVehicles: row.totalVehicles || 0,
        totalDrivers: row.totalDrivers || 0,
        totalRoutes: row.totalRoutes || 0,
        todayTrips: row.todayTrips || 0,
      },
      activeTrips: []
    };
  }

  async getVehicles() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT *, registration_number AS plate_number FROM transport_vehicles WHERE tenant_id = $1 ORDER BY registration_number ASC`,
      [tenantId]
    );
    return res.rows;
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
    const res = await this.executeSql(
      `SELECT * FROM transport_drivers WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
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
    const res = await this.executeSql(
      `SELECT *, name AS route_name FROM transport_routes WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
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
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const vehicleId = this.operations.requiredText(dto?.vehicle_id ?? dto?.vehicleId, 'Vehicle');
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, payload
        )
        VALUES ($1, $2::uuid, 'transport_manager', $3::jsonb, 'transport.route_vehicle_assigned', 'transport_route', $4, 'Vehicle assigned to route', $5, $6::jsonb)
        RETURNING *
      `,
      [tenantId, userId, JSON.stringify(['principal', 'transport_manager']), id, `Vehicle ${vehicleId} assigned to route ${id}.`, JSON.stringify({ route_id: id, vehicle_id: vehicleId })],
    );
    const event = result.rows[0];
    await this.operations.recordAudit(tenantId, 'transport.route_vehicle_assigned', 'transport_route', id, { event }, userId);
    return { success: true, message: 'Vehicle assignment recorded', assignment: event };
  }

  async getTrips() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM transport_trips WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
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
    const fuelRes = await this.executeSql(
      `SELECT * FROM transport_fuel_logs WHERE tenant_id = $1 ORDER BY log_date DESC`,
      [tenantId]
    );
    const maintRes = await this.executeSql(
      `SELECT * FROM transport_maintenance_logs WHERE tenant_id = $1 ORDER BY log_date DESC`,
      [tenantId]
    );
    return {
      fuelLogs: fuelRes.rows,
      maintenanceLogs: maintRes.rows
    };
  }

  async logFuel(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const vehicleId = this.operations.requiredText(dto?.vehicleId ?? dto?.vehicle_id, 'Vehicle');
    const amount = Number(dto?.amount ?? dto?.litres ?? dto?.liters);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Fuel amount must be greater than zero');
    }
    const result = await this.operations.writeSql(
      `
        INSERT INTO transport_fuel_logs (tenant_id, vehicle_id, amount, cost, log_date, created_by)
        VALUES ($1, $2::uuid, $3, $4, COALESCE($5::date, CURRENT_DATE), $6::uuid)
        RETURNING *
      `,
      [tenantId, vehicleId, amount, Number(dto?.cost ?? 0), dto?.log_date ?? dto?.logDate ?? null, userId],
    );
    const log = result.rows[0];
    await this.operations.recordAudit(tenantId, 'transport.fuel_logged', 'transport_vehicle', vehicleId, { log }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `transport-fuel-${log.id}`,
      type: 'transport.fuel_logged',
      title: 'Fuel log recorded',
      body: `${amount} fuel unit(s) were recorded for vehicle ${vehicleId}.`,
      targetRoles: ['principal', 'transport_manager', 'accountant'],
      metadata: { log },
    });
    return { success: true, message: 'Fuel log persisted', log };
  }

  async logMaintenance(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const vehicleId = this.operations.requiredText(dto?.vehicleId ?? dto?.vehicle_id, 'Vehicle');
    const description = this.operations.requiredText(dto?.description, 'Maintenance description');
    const result = await this.operations.writeSql(
      `
        INSERT INTO transport_maintenance_logs (tenant_id, vehicle_id, description, cost, log_date, created_by)
        VALUES ($1, $2::uuid, $3, $4, COALESCE($5::date, CURRENT_DATE), $6::uuid)
        RETURNING *
      `,
      [tenantId, vehicleId, description, Number(dto?.cost ?? 0), dto?.log_date ?? dto?.logDate ?? null, userId],
    );
    const log = result.rows[0];
    await this.operations.recordAudit(tenantId, 'transport.maintenance_logged', 'transport_vehicle', vehicleId, { log }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `transport-maintenance-${log.id}`,
      type: 'transport.maintenance_logged',
      title: 'Vehicle maintenance logged',
      body: `Maintenance was recorded for vehicle ${vehicleId}.`,
      targetRoles: ['principal', 'transport_manager', 'accountant'],
      metadata: { log },
    });
    return { success: true, message: 'Maintenance log persisted', log };
  }

  async getStudentTransportList() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT ms.*, s.first_name || ' ' || s.last_name AS student_name
        FROM transport_manifest_students ms
        LEFT JOIN students s ON s.id = ms.student_id
        WHERE ms.tenant_id = $1
        ORDER BY student_name ASC
      `,
      [tenantId]
    );
    return res.rows;
  }

  async assignStudentTransport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        INSERT INTO transport_manifest_students (tenant_id, manifest_id, student_id, pickup_stop_id, dropoff_stop_id, guardian_contact, notes)
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7)
        ON CONFLICT (tenant_id, manifest_id, student_id)
        DO UPDATE SET boarding_status = 'active', pickup_stop_id = EXCLUDED.pickup_stop_id, dropoff_stop_id = EXCLUDED.dropoff_stop_id, guardian_contact = EXCLUDED.guardian_contact, notes = EXCLUDED.notes, updated_at = NOW()
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(dto?.manifest_id ?? dto?.manifestId, 'Transport manifest'),
        this.operations.requiredText(dto?.student_id ?? dto?.studentId, 'Student'),
        this.operations.uuidOrNull(dto?.pickup_stop_id ?? dto?.pickupStopId),
        this.operations.uuidOrNull(dto?.dropoff_stop_id ?? dto?.dropoffStopId),
        dto?.guardian_contact ?? dto?.guardianContact ?? null,
        dto?.notes ?? null,
      ],
    );
    const assignment = result.rows[0];
    await this.operations.recordAudit(tenantId, 'transport.student_assigned', 'transport_manifest_student', assignment.id, { assignment }, userId);
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
    return this.operations.listReportSnapshots(tenantId, 'transport-manager-command');
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

  async sendNotice(dto: any) {
    const tenantId = this.requireTenantId();
    const title = this.operations.requiredText(dto?.title, 'Transport notice title');
    const message = this.operations.requiredText(dto?.message || dto?.body, 'Transport notice message');
    const noticeType = String(dto?.notice_type || 'general').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_') || 'general';
    const targetRoles = Array.isArray(dto?.target_roles)
      ? dto.target_roles.map((role: unknown) => String(role).trim()).filter(Boolean).slice(0, 8)
      : ['parent'];
    if (targetRoles.length === 0) {
      throw new BadRequestException('At least one recipient role is required');
    }
    const channels = Array.isArray(dto?.channels)
      ? dto.channels.map((channel: unknown) => String(channel).trim()).filter(Boolean)
      : ['in_app'];

    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.currentUserId(),
      sourceRole: 'transport_manager',
      targetRoles,
      eventType: 'transport.notice_sent',
      entityType: 'transport_notice',
      entityId: dto?.entityId ?? dto?.entity_id ?? null,
      title,
      message,
      priority: dto?.priority === 'high' || dto?.priority === 'urgent' ? 'high' : 'normal',
      payload: {
        ...dto,
        notice_type: noticeType,
        target_roles: targetRoles,
        channels,
        source_dashboard: 'transport-manager-dashboard',
      },
    });

    await this.operations.notifyRoles(tenantId, {
      key: `transport-notice-${event?.id ?? Date.now()}`,
      type: 'transport.notice_sent',
      title,
      body: message,
      targetRoles,
      metadata: {
        notice_type: noticeType,
        channels,
        event_id: event?.id ?? null,
      },
    });

    return { success: true, event };
  }
}
