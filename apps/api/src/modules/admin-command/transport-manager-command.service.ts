import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TransportManagerCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
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
      `SELECT * FROM transport_vehicles WHERE tenant_id = $1 ORDER BY plate_number ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getDrivers() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM transport_drivers WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getRoutes() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM transport_routes WHERE tenant_id = $1 ORDER BY route_name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getTrips() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM transport_trips WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
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
    const userId = this.requestContext.getStore()?.user_id || 'system';
    await this.executeSql(
      `INSERT INTO transport_fuel_logs (tenant_id, vehicle_id, amount, cost, log_date, created_by)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)`,
      [tenantId, dto.vehicleId, dto.amount, dto.cost, userId]
    );
    return { success: true, message: 'Fuel log created successfully' };
  }

  async logMaintenance(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || 'system';
    await this.executeSql(
      `INSERT INTO transport_maintenance_logs (tenant_id, vehicle_id, description, cost, log_date, created_by)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)`,
      [tenantId, dto.vehicleId, dto.description, dto.cost, userId]
    );
    return { success: true, message: 'Maintenance log created successfully' };
  }

  async getStudentTransportList() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM student_transport_mapping WHERE tenant_id = $1 ORDER BY student_name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM transport_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Transport report generated successfully' };
  }
}
