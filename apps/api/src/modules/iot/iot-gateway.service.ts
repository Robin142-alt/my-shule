import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ModuleAccessService } from '../module-access/module-access.service';
import {
  IotGatewayCommandAckDto,
  IotGatewayCommandPollDto,
  IotGatewayTelemetryDto,
  IotGatewayTelemetryReadingDto,
} from './dto/iot.dto';
import {
  hashIotGatewayPayload,
  verifyIotDeviceCredential,
} from './iot-gateway-auth';
import { IotRepository } from './repositories/iot.repository';

export interface IotGatewayHeaders {
  tenantId?: string;
  keyId?: string;
  deviceToken?: string;
  idempotencyKey?: string;
  timestamp?: string;
}

interface AuthenticatedIotGatewayDevice {
  tenantId: string;
  keyId: string;
  credential: Record<string, unknown>;
}

@Injectable()
export class IotGatewayService {
  constructor(
    private readonly moduleAccessService: ModuleAccessService,
    private readonly repository: IotRepository,
    @Optional() private readonly requestContext?: RequestContextService,
  ) {}

  async ingestTelemetry(dto: IotGatewayTelemetryDto, headers: IotGatewayHeaders) {
    const { tenantId, keyId, credential } = await this.authenticateDevice(headers, dto.external_device_id);
    const idempotencyKey = this.requireText(headers.idempotencyKey, 'IoT idempotency key');

    if (idempotencyKey.length > 128) {
      throw new BadRequestException('IoT idempotency key is too long');
    }

    const readings = this.normalizeReadings(dto.readings);
    const existing = await this.repository.findGatewayIngestion({
      tenant_id: tenantId,
      credential_id: credential.id,
      idempotency_key: idempotencyKey,
    });

    if (existing) {
      await this.audit(tenantId, 'iot.gateway.duplicate', 'iot_gateway_ingestion', existing.id, {
        key_id: keyId,
        idempotency_key: idempotencyKey,
      });

      return {
        id: existing.id,
        status: 'duplicate',
        reading_count: existing.reading_count,
      };
    }

    const payloadHash = hashIotGatewayPayload({ readings, metadata: dto.metadata ?? {} });
    const ingestion = await this.repository.recordGatewayTelemetry({
      tenant_id: tenantId,
      device_id: credential.device_id,
      credential_id: credential.id,
      idempotency_key: idempotencyKey,
      payload_sha256: payloadHash,
      readings,
      metadata: dto.metadata ?? {},
    });

    await this.audit(tenantId, 'iot.gateway.telemetry.accepted', 'iot_gateway_ingestion', ingestion?.id, {
      key_id: keyId,
      idempotency_key: idempotencyKey,
      reading_count: readings.length,
      payload_sha256: payloadHash,
    });

    return {
      id: ingestion?.id,
      status: 'accepted',
      reading_count: readings.length,
    };
  }

  async pollCommands(dto: IotGatewayCommandPollDto, headers: IotGatewayHeaders) {
    const { tenantId, keyId, credential } = await this.authenticateDevice(headers, dto.external_device_id);
    const limit = this.normalizeCommandPollLimit(dto.limit);
    const commands = await this.repository.pollGatewayCommands({
      tenant_id: tenantId,
      device_id: credential.device_id,
      credential_id: credential.id,
      limit,
    });

    await this.audit(tenantId, 'iot.gateway.commands.polled', 'iot_device', String(credential.device_id), {
      key_id: keyId,
      command_count: Array.isArray(commands) ? commands.length : 0,
    });

    return {
      status: 'ok',
      command_count: Array.isArray(commands) ? commands.length : 0,
      commands: Array.isArray(commands) ? commands : [],
    };
  }

  async acknowledgeCommand(
    commandId: string,
    dto: IotGatewayCommandAckDto,
    headers: IotGatewayHeaders,
  ) {
    const { tenantId, keyId, credential } = await this.authenticateDevice(headers, dto.external_device_id);
    const status = this.normalizeCommandAckStatus(dto.status);
    const command = await this.repository.acknowledgeGatewayCommand({
      tenant_id: tenantId,
      device_id: credential.device_id,
      credential_id: credential.id,
      command_id: this.requireText(commandId, 'Command id'),
      status,
      result_metadata: dto.result_metadata ?? {},
    });

    if (!command) {
      throw new BadRequestException('IoT command was not found for this device');
    }

    await this.audit(tenantId, 'iot.gateway.command.acknowledged', 'iot_device_command', String(command.id), {
      key_id: keyId,
      status,
    });

    return command;
  }

  private async authenticateDevice(
    headers: IotGatewayHeaders,
    externalDeviceId?: string,
  ): Promise<AuthenticatedIotGatewayDevice> {
    const requestTenantId = this.requestContext?.getStore()?.tenant_id ?? null;
    const tenantId = this.requireText(headers.tenantId ?? requestTenantId ?? undefined, 'IoT tenant header');
    const keyId = this.requireText(headers.keyId, 'IoT key id header');
    const deviceToken = this.requireText(headers.deviceToken, 'IoT device credential');
    this.assertFreshTimestamp(headers.timestamp);

    if (requestTenantId && headers.tenantId && requestTenantId !== headers.tenantId) {
      throw new UnauthorizedException('IoT tenant header does not match the request tenant');
    }

    const missingModule = await this.moduleAccessService.findFirstMissingModule(tenantId, ['iot']);

    if (missingModule) {
      throw new ForbiddenException('IoT module is not enabled for this tenant');
    }

    const credential = await this.repository.findGatewayCredential({
      tenant_id: tenantId,
      key_id: keyId,
    });

    if (!credential || credential.status !== 'active') {
      throw new UnauthorizedException('Invalid IoT device credential');
    }

    if (credential.expires_at && new Date(String(credential.expires_at)).getTime() <= Date.now()) {
      throw new UnauthorizedException('IoT device credential has expired');
    }

    if (!verifyIotDeviceCredential(deviceToken, String(credential.credential_hash))) {
      throw new UnauthorizedException('Invalid IoT device credential');
    }

    if (
      externalDeviceId
      && credential.external_device_id
      && externalDeviceId !== credential.external_device_id
    ) {
      throw new UnauthorizedException('IoT device credential does not match the device');
    }

    return { tenantId, keyId, credential };
  }

  private normalizeReadings(readings: IotGatewayTelemetryReadingDto[] | undefined) {
    if (!Array.isArray(readings) || readings.length === 0) {
      throw new BadRequestException('At least one IoT reading is required');
    }

    if (readings.length > 100) {
      throw new BadRequestException('IoT gateway accepts at most 100 readings per request');
    }

    return readings.map((reading) => ({
      metric_name: this.requireText(reading.metric_name, 'Metric name'),
      metric_value: this.requireFiniteNumber(reading.metric_value),
      unit: this.optionalText(reading.unit),
      severity: reading.severity ?? 'normal',
      recorded_at: reading.recorded_at ?? null,
      metadata: reading.metadata ?? {},
    }));
  }

  private assertFreshTimestamp(value: string | undefined): void {
    const timestamp = this.requireText(value, 'IoT timestamp header');
    const timestampMs = Date.parse(timestamp);

    if (!Number.isFinite(timestampMs)) {
      throw new BadRequestException('IoT timestamp header is invalid');
    }

    const driftMs = Math.abs(Date.now() - timestampMs);

    if (driftMs > 10 * 60 * 1000) {
      throw new UnauthorizedException('IoT timestamp is outside the accepted window');
    }
  }

  private normalizeCommandPollLimit(value: number | undefined): number {
    const numeric = Number(value ?? 10);

    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('Command poll limit must be a finite number');
    }

    return Math.min(20, Math.max(1, Math.trunc(numeric)));
  }

  private normalizeCommandAckStatus(value: string | undefined): 'acknowledged' | 'failed' {
    if (value === 'acknowledged' || value === 'failed') {
      return value;
    }

    throw new BadRequestException('Command acknowledgement status must be acknowledged or failed');
  }

  private async audit(
    tenantId: string,
    action: string,
    resourceType: string,
    resourceId: string | undefined,
    metadata: Record<string, unknown>,
  ) {
    await this.repository.appendAuditLog({
      tenant_id: tenantId,
      actor_user_id: null,
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      metadata,
    });
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
