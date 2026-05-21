import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  CreateIotDeviceDto,
  DispatchIotCommandDto,
  IssueIotDeviceCredentialDto,
  RecordIotTelemetryDto,
} from './dto/iot.dto';
import {
  generateIotDeviceCredentialSecret,
  hashIotDeviceCredential,
} from './iot-gateway-auth';
import { IotRepository } from './repositories/iot.repository';

@Injectable()
export class IotService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: IotRepository,
  ) {}

  getDashboard() {
    this.assertPermission('iot:read');

    return this.repository.getDashboard(this.requireTenantId());
  }

  async registerDevice(dto: CreateIotDeviceDto) {
    this.assertPermission('iot:write');
    const device = await this.repository.registerDevice({
      ...dto,
      name: this.requireText(dto.name, 'Device name'),
      device_type: this.requireText(dto.device_type, 'Device type'),
      location_name: this.optionalText(dto.location_name),
      external_device_id: this.optionalText(dto.external_device_id),
      metadata: dto.metadata ?? {},
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });

    await this.audit('iot.device.registered', 'iot_device', device?.id, {
      name: dto.name,
      device_type: dto.device_type,
    });

    return device;
  }

  async recordTelemetry(dto: RecordIotTelemetryDto) {
    this.assertPermission('iot:write');
    const reading = await this.repository.recordTelemetry({
      ...dto,
      device_id: this.requireText(dto.device_id, 'Device id'),
      metric_name: this.requireText(dto.metric_name, 'Metric name'),
      metric_value: this.requireFiniteNumber(dto.metric_value),
      severity: dto.severity ?? 'normal',
      metadata: dto.metadata ?? {},
      tenant_id: this.requireTenantId(),
      recorded_by_user_id: this.requireUserId(),
    });

    await this.audit('iot.telemetry.recorded', 'iot_telemetry_reading', reading?.id, {
      device_id: dto.device_id,
      metric_name: dto.metric_name,
      severity: dto.severity ?? 'normal',
    });

    return reading;
  }

  async dispatchCommand(dto: DispatchIotCommandDto) {
    this.assertPermission('iot:write');
    const command = await this.repository.dispatchCommand({
      ...dto,
      device_id: this.requireText(dto.device_id, 'Device id'),
      command_type: this.requireText(dto.command_type, 'Command type'),
      payload: dto.payload ?? {},
      priority: dto.priority ?? 'normal',
      tenant_id: this.requireTenantId(),
      requested_by_user_id: this.requireUserId(),
    });

    await this.audit('iot.command.dispatched', 'iot_device_command', command?.id, {
      device_id: dto.device_id,
      command_type: dto.command_type,
    });

    return command;
  }

  async issueDeviceCredential(deviceId: string, dto: IssueIotDeviceCredentialDto = {}) {
    this.assertPermission('iot:write');
    const secret = generateIotDeviceCredentialSecret();
    const credential = await this.repository.issueDeviceCredential({
      tenant_id: this.requireTenantId(),
      device_id: this.requireText(deviceId, 'Device id'),
      label: this.optionalText(dto.label),
      key_id: `iot_${Date.now().toString(36)}_${secret.slice(-8)}`,
      credential_hash: hashIotDeviceCredential(secret),
      expires_at: dto.expires_at ?? null,
      created_by_user_id: this.requireUserId(),
    });

    await this.audit('iot.device_credential.issued', 'iot_device_credential', credential?.id, {
      device_id: deviceId,
      key_id: credential?.key_id,
    });

    return {
      id: credential?.id,
      device_id: credential?.device_id,
      key_id: credential?.key_id,
      secret,
      expires_at: credential?.expires_at ?? null,
    };
  }

  async resolveAlert(alertId: string) {
    this.assertPermission('iot:write');
    const alert = await this.repository.resolveAlert({
      tenant_id: this.requireTenantId(),
      alert_id: this.requireText(alertId, 'Alert id'),
      resolved_by_user_id: this.requireUserId(),
    });

    await this.audit('iot.alert.resolved', 'iot_alert', alert?.id, {
      alert_id: alertId,
    });

    return alert;
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

    throw new ForbiddenException('IoT permission is required');
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for IoT operations');
    }

    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for IoT operations');
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

  private optionalText(value: string | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized || null;
  }

  private requireFiniteNumber(value: number | undefined): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('Metric value must be a finite number');
    }

    return numeric;
  }
}
