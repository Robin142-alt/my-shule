import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  CreateTransportDriverDto,
  CreateTransportManifestDto,
  CreateTransportRouteDto,
  CreateTransportVehicleDto,
  RecordTransportTripEventDto,
  RecordVehicleServiceDto,
  StartTransportTripDto,
} from './dto/transport.dto';
import { TransportRepository } from './repositories/transport.repository';

@Injectable()
export class TransportService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: TransportRepository,
  ) {}

  getDashboard() {
    this.assertPermission('transport:read');

    return this.repository.getDashboard(this.requireTenantId());
  }

  async createRoute(dto: CreateTransportRouteDto) {
    this.assertPermission('transport:write');
    const route = await this.repository.createRoute({
      ...dto,
      name: this.requireText(dto.name, 'Route name'),
      direction: dto.direction ?? 'round_trip',
      fare_amount_minor: this.optionalNonNegativeNumber(dto.fare_amount_minor, 'Fare amount'),
      stops: this.normalizeStops(dto.stops ?? []),
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });

    await this.audit('transport.route.created', 'transport_route', route?.id, {
      name: dto.name,
      direction: dto.direction,
      stop_count: dto.stops?.length ?? 0,
    });

    return route;
  }

  async createVehicle(dto: CreateTransportVehicleDto) {
    this.assertPermission('transport:write');
    const vehicle = await this.repository.createVehicle({
      ...dto,
      registration_number: this.requireText(dto.registration_number, 'Registration number').toUpperCase(),
      capacity: this.requirePositiveInteger(dto.capacity, 'Vehicle capacity'),
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });

    await this.audit('transport.vehicle.created', 'transport_vehicle', vehicle?.id, {
      registration_number: dto.registration_number,
      capacity: dto.capacity,
    });

    return vehicle;
  }

  async createDriver(dto: CreateTransportDriverDto) {
    this.assertPermission('transport:write');
    const driver = await this.repository.createDriver({
      ...dto,
      name: this.requireText(dto.name, 'Driver name'),
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });

    await this.audit('transport.driver.created', 'transport_driver', driver?.id, {
      name: dto.name,
      license_number: dto.license_number ?? null,
    });

    return driver;
  }

  async createManifest(dto: CreateTransportManifestDto) {
    this.assertPermission('transport:write');
    const studentIds = this.requireUniqueIds(dto.student_ids, 'Transport manifest students');
    const manifest = await this.repository.createManifest({
      ...dto,
      student_ids: studentIds,
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });

    await this.audit('transport.manifest.created', 'transport_manifest', manifest?.id, {
      route_id: dto.route_id,
      learner_count: studentIds.length,
    });

    return manifest;
  }

  async startTrip(dto: StartTransportTripDto) {
    this.assertPermission('transport:write');
    const trip = await this.repository.startTrip({
      ...dto,
      tenant_id: this.requireTenantId(),
      started_by_user_id: this.requireUserId(),
      learner_count: this.optionalNonNegativeNumber(dto.learner_count, 'Learner count'),
    });

    await this.audit('transport.trip.started', 'transport_trip', trip?.id, {
      route_id: dto.route_id,
      vehicle_id: dto.vehicle_id,
      driver_id: dto.driver_id ?? null,
    });

    return trip;
  }

  async recordTripEvent(tripId: string, dto: RecordTransportTripEventDto) {
    this.assertPermission('transport:write');
    const event = await this.repository.recordTripEvent({
      ...dto,
      trip_id: this.requireText(tripId, 'Trip id'),
      event_type: this.requireText(dto.event_type, 'Trip event type'),
      tenant_id: this.requireTenantId(),
      recorded_by_user_id: this.requireUserId(),
    });

    await this.audit('transport.trip.event_recorded', 'transport_trip_event', event?.id, {
      trip_id: tripId,
      event_type: dto.event_type,
      student_id: dto.student_id ?? null,
    });

    return event;
  }

  async recordVehicleService(vehicleId: string, dto: RecordVehicleServiceDto) {
    this.assertPermission('transport:write');
    const serviceLog = await this.repository.recordVehicleService({
      ...dto,
      vehicle_id: this.requireText(vehicleId, 'Vehicle id'),
      cost_minor: this.optionalNonNegativeNumber(dto.cost_minor, 'Service cost'),
      tenant_id: this.requireTenantId(),
      recorded_by_user_id: this.requireUserId(),
    });

    await this.audit('transport.vehicle.service_recorded', 'vehicle_service_log', serviceLog?.id, {
      vehicle_id: vehicleId,
      next_service_date: dto.next_service_date ?? null,
    });

    return serviceLog;
  }

  async resolveAlert(alertId: string) {
    this.assertPermission('transport:write');
    const alert = await this.repository.resolveAlert({
      tenant_id: this.requireTenantId(),
      alert_id: this.requireText(alertId, 'Alert id'),
      resolved_by_user_id: this.requireUserId(),
    });

    await this.audit('transport.alert.resolved', 'transport_alert', alert?.id, {
      alert_id: alertId,
    });

    return alert;
  }

  private normalizeStops(stops: CreateTransportRouteDto['stops']) {
    return (stops ?? []).map((stop, index) => ({
      ...stop,
      name: this.requireText(stop.name, 'Route stop name'),
      sequence: this.requirePositiveInteger(stop.sequence ?? index + 1, 'Route stop sequence'),
    }));
  }

  private requireUniqueIds(values: string[] | undefined, fieldName: string): string[] {
    const ids = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];

    if (ids.length === 0) {
      throw new BadRequestException(`${fieldName} are required`);
    }

    return ids;
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

    throw new ForbiddenException('Transport permission is required');
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for transport operations');
    }

    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for transport operations');
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

  private requirePositiveInteger(value: number | undefined, fieldName: string): number {
    const numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new BadRequestException(`${fieldName} must be greater than zero`);
    }

    return numeric;
  }

  private optionalNonNegativeNumber(value: number | undefined, fieldName: string): number {
    if (value === undefined || value === null) {
      return 0;
    }

    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new BadRequestException(`${fieldName} cannot be negative`);
    }

    return numeric;
  }
}
