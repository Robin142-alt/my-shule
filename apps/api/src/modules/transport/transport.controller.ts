
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  CreateTransportDriverDto,
  CreateTransportManifestDto,
  CreateTransportRouteDto,
  CreateTransportVehicleDto,
  RecordTransportTripEventDto,
  RecordVehicleServiceDto,
  StartTransportTripDto,
} from './dto/transport.dto';
import { TransportService } from './transport.service';

@Controller('transport')
@RequiresModule('transport')
export class TransportController {

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


  @Inject(PrismaService)
  private readonly db!: PrismaService;

  @Inject(RequestContextService)
  private readonly requestContext!: RequestContextService;

  @Inject(SchoolOperationalEventsService)
  private readonly events!: SchoolOperationalEventsService;

  constructor(private readonly prisma: PrismaService, private readonly transportService: TransportService) {}

  @Get('dashboard')
  @Permissions('transport:read')
  getDashboard() {
    return this.transportService.getDashboard();
  }

  @Post('routes')
  @Permissions('transport:write')
  createRoute(@Body() dto: CreateTransportRouteDto) {
    return this.transportService.createRoute(dto);
  }

  @Post('vehicles')
  @Permissions('transport:write')
  createVehicle(@Body() dto: CreateTransportVehicleDto) {
    return this.transportService.createVehicle(dto);
  }

  @Post('drivers')
  @Permissions('transport:write')
  createDriver(@Body() dto: CreateTransportDriverDto) {
    return this.transportService.createDriver(dto);
  }

  @Post('manifests')
  @Permissions('transport:write')
  createManifest(@Body() dto: CreateTransportManifestDto) {
    return this.transportService.createManifest(dto);
  }

  @Post('trips')
  @Permissions('transport:write')
  startTrip(@Body() dto: StartTransportTripDto) {
    return this.transportService.startTrip(dto);
  }

  @Post('trips/:tripId/events')
  @Permissions('transport:write')
  recordTripEvent(
    @Param('tripId') tripId: string,
    @Body() dto: RecordTransportTripEventDto,
  ) {
    return this.transportService.recordTripEvent(tripId, dto);
  }

  @Post('vehicles/:vehicleId/service-logs')
  @Permissions('transport:write')
  recordVehicleService(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: RecordVehicleServiceDto,
  ) {
    return this.transportService.recordVehicleService(vehicleId, dto);
  }

  @Patch('alerts/:alertId/resolve')
  @Permissions('transport:write')
  resolveAlert(@Param('alertId') alertId: string) {
    return this.transportService.resolveAlert(alertId);
  }

  @Post('assignments')
  @Permissions('transport:write')
  async createAssignmentPhase5(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const result = await this.db.query(
      `INSERT INTO transport_routes (tenant_id, school_id, name, description) 
       VALUES ($1, $1, $2, $3) RETURNING *`,
      [store.tenant_id, store.tenant_id, body.name || 'Route', body.description || 'Route Desc']
    );
    await this.events.recordSchoolOperation({
      schoolId: store.tenant_id,
      event: { 
        id: result.rows[0].id,
        type: 'transport.assignment.created', 
        module: 'transport', 
        title: 'New Transport Assignment', 
        body: 'A new transport assignment was created', 
        actorRole: store.role || 'system',
        createdAt: new Date().toISOString()
      }
    });
    return result.rows[0];
  }


  @Get('vehicles')
  @Permissions('transport:read')
  async getVehicles() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    const items = await this.prisma.transportVehicle.findMany({
      where: { schoolId: tenantId },
    });
    return (items as any[]).map((item) => ({
      id: item.id,
      vehicle: `${item.vehicleType ?? 'Vehicle'} (${item.registrationNumber ?? item.registration_number ?? 'Unregistered'})`,
      route: item.routeName ?? item.route?.name ?? item.route_name ?? 'Unassigned route',
      driver: item.driverName ?? item.driver?.name ?? item.driver_name ?? 'Unassigned driver',
      status: this.transportStatusLabel(item.status),
      fuelLevel: Number(item.fuelLevel ?? item.fuel_level ?? 0),
      maintenanceNote: item.maintenanceNote ?? item.maintenance_note ?? '',
    }));
  }

  @Get('trips')
  @Permissions('transport:read')
  async getTrips() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    const items = await this.prisma.transportTrips.findMany({
      where: { tenant_id: tenantId },
    });
    return (items as any[]).map((item) => ({
      id: item.id,
      student: item.studentName ?? item.student?.fullName ?? item.student?.name ?? item.learner_name ?? 'Unassigned learner',
      admissionNo: item.admissionNo ?? item.student?.admissionNumber ?? item.admission_no ?? '',
      route: item.routeName ?? item.route?.name ?? item.route_name ?? item.direction ?? 'Unassigned route',
      stop: item.stopName ?? item.stop?.name ?? item.stop_name ?? '',
      pickupTime: item.scheduled_start_at instanceof Date ? item.scheduled_start_at.toISOString() : item.scheduled_start_at,
      status: item.status === 'started' ? 'Boarded' : item.status === 'completed' ? 'Dropped' : 'Scheduled',
    }));
  }

  private transportStatusLabel(status: string | null | undefined) {
    const normalized = String(status ?? '').toLowerCase();
    if (normalized.includes('maintenance')) return 'Maintenance';
    if (normalized.includes('delay')) return 'Delayed';
    if (normalized.includes('offline')) return 'Offline';
    return 'Active';
  }
}
