import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { IS_PUBLIC_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { IotController } from './iot.controller';
import { IotGatewayController } from './iot-gateway.controller';
import { hashIotDeviceCredential } from './iot-gateway-auth';
import { IotGatewayService } from './iot-gateway.service';
import { IotSchemaService } from './iot-schema.service';
import { IotService } from './iot.service';

test('IotSchemaService creates tenant-safe IoT tables', async () => {
  let schemaSql = '';
  const service = new IotSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  for (const table of [
    'iot_devices',
    'iot_telemetry_readings',
    'iot_device_commands',
    'iot_device_credentials',
    'iot_gateway_ingestions',
    'iot_alerts',
    'iot_audit_logs',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }
});

test('IotController is gated by iot module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, IotController), ['iot']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(IotController.prototype, 'getDashboard')?.value;
  const registerHandler = Object.getOwnPropertyDescriptor(IotController.prototype, 'registerDevice')?.value;
  const telemetryHandler = Object.getOwnPropertyDescriptor(IotController.prototype, 'recordTelemetry')?.value;
  const commandHandler = Object.getOwnPropertyDescriptor(IotController.prototype, 'dispatchCommand')?.value;
  const credentialHandler = Object.getOwnPropertyDescriptor(IotController.prototype, 'issueDeviceCredential')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['iot:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, registerHandler), ['iot:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, telemetryHandler), ['iot:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, commandHandler), ['iot:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, credentialHandler), ['iot:write']);
});

test('IotGatewayController exposes public device telemetry and command endpoints', () => {
  const telemetryHandler = Object.getOwnPropertyDescriptor(IotGatewayController.prototype, 'ingestTelemetry')?.value;
  const pollHandler = Object.getOwnPropertyDescriptor(IotGatewayController.prototype, 'pollCommands')?.value;
  const ackHandler = Object.getOwnPropertyDescriptor(IotGatewayController.prototype, 'acknowledgeCommand')?.value;

  assert.equal(Reflect.getMetadata(IS_PUBLIC_KEY, telemetryHandler), true);
  assert.equal(Reflect.getMetadata(IS_PUBLIC_KEY, pollHandler), true);
  assert.equal(Reflect.getMetadata(IS_PUBLIC_KEY, ackHandler), true);
});

test('IotService registers devices, records telemetry, dispatches commands, and resolves alerts', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new IotService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-1111-1111-111111111111',
        permissions: ['iot:*'],
      }),
    } as never,
    {
      getDashboard: async (tenantId: string) => {
        calls.push({ method: 'getDashboard', tenant_id: tenantId });
        return {
          registered_devices: 1,
          online_devices: 1,
          offline_devices: 0,
          open_alerts: 0,
          commands_pending: 1,
          readings_today: 2,
          devices: [],
          readings: [],
          commands: [],
          alerts: [],
        };
      },
      registerDevice: async (input: Record<string, unknown>) => {
        calls.push({ method: 'registerDevice', ...input });
        return { id: 'device-1', name: input.name };
      },
      recordTelemetry: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recordTelemetry', ...input });
        return { id: 'reading-1', device_id: input.device_id };
      },
      dispatchCommand: async (input: Record<string, unknown>) => {
        calls.push({ method: 'dispatchCommand', ...input });
        return { id: 'command-1', command_type: input.command_type };
      },
      issueDeviceCredential: async (input: Record<string, unknown>) => {
        calls.push({ method: 'issueDeviceCredential', ...input });
        return { id: 'credential-1', key_id: input.key_id };
      },
      resolveAlert: async (input: Record<string, unknown>) => {
        calls.push({ method: 'resolveAlert', ...input });
        return { id: input.alert_id, status: 'resolved' };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ method: 'appendAuditLog', ...input });
      },
    } as never,
  );

  await service.registerDevice({
    name: 'Smart meter A1',
    device_type: 'smart_meter',
    location_name: 'Administration block',
    external_device_id: 'meter-a1',
  });
  await service.recordTelemetry({
    device_id: 'device-1',
    metric_name: 'power_kw',
    metric_value: 8.4,
    unit: 'kw',
    severity: 'normal',
  });
  await service.dispatchCommand({
    device_id: 'device-1',
    command_type: 'sync',
    payload: { reason: 'manual refresh' },
  });
  const credential = await service.issueDeviceCredential('device-1', { label: 'Gate gateway' });
  await service.resolveAlert('alert-1');
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.registered_devices, 1);
  assert.equal(typeof credential.secret, 'string');
  assert.equal(credential.secret.length > 20, true);
  assert.deepEqual(calls.map((call) => call.method), [
    'registerDevice',
    'appendAuditLog',
    'recordTelemetry',
    'appendAuditLog',
    'dispatchCommand',
    'appendAuditLog',
    'issueDeviceCredential',
    'appendAuditLog',
    'resolveAlert',
    'appendAuditLog',
    'getDashboard',
  ]);
  assert.equal(calls[0]?.tenant_id, 'tenant-a');
});

test('IotService rejects unsafe telemetry before repository writes', async () => {
  const service = new IotService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-1111-1111-111111111111',
        permissions: ['iot:*'],
      }),
    } as never,
    {
      recordTelemetry: async () => {
        throw new Error('repository should not be called');
      },
    } as never,
  );

  await assert.rejects(
    () => service.recordTelemetry({
      device_id: 'device-1',
      metric_name: 'power_kw',
      metric_value: Number.NaN,
    }),
    /Metric value must be a finite number/i,
  );
});

test('IotGatewayService authenticates devices, records idempotent telemetry, and updates gateway evidence', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const credentialHash = hashIotDeviceCredential('device-token-1');
  const service = new IotGatewayService(
    {
      findFirstMissingModule: async (tenantId: string, modules: string[]) => {
        calls.push({ method: 'findFirstMissingModule', tenant_id: tenantId, modules });
        return null;
      },
    } as never,
    {
      findGatewayCredential: async (input: Record<string, unknown>) => {
        calls.push({ method: 'findGatewayCredential', ...input });
        return {
          id: 'credential-1',
          tenant_id: input.tenant_id,
          device_id: 'device-1',
          external_device_id: 'meter-a1',
          credential_hash: credentialHash,
          status: 'active',
          expires_at: null,
        };
      },
      findGatewayIngestion: async (input: Record<string, unknown>) => {
        calls.push({ method: 'findGatewayIngestion', ...input });
        return null;
      },
      recordGatewayTelemetry: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recordGatewayTelemetry', ...input });
        return {
          id: 'ingestion-1',
          status: 'accepted',
          reading_count: Array.isArray(input.readings) ? input.readings.length : 0,
        };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ method: 'appendAuditLog', ...input });
      },
    } as never,
  );

  const result = await service.ingestTelemetry(
    {
      external_device_id: 'meter-a1',
      readings: [
        {
          metric_name: 'power_kw',
          metric_value: 8.4,
          unit: 'kw',
          severity: 'normal',
        },
      ],
    },
    {
      tenantId: 'tenant-a',
      keyId: 'key-1',
      deviceToken: 'device-token-1',
      idempotencyKey: 'retry-1',
      timestamp: new Date().toISOString(),
    },
  );

  assert.equal(result.status, 'accepted');
  assert.deepEqual(calls.map((call) => call.method), [
    'findFirstMissingModule',
    'findGatewayCredential',
    'findGatewayIngestion',
    'recordGatewayTelemetry',
    'appendAuditLog',
  ]);
});

test('IotGatewayService rejects invalid device tokens before gateway writes', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new IotGatewayService(
    {
      findFirstMissingModule: async () => null,
    } as never,
    {
      findGatewayCredential: async () => ({
        id: 'credential-1',
        tenant_id: 'tenant-a',
        device_id: 'device-1',
        external_device_id: 'meter-a1',
        credential_hash: hashIotDeviceCredential('expected-token'),
        status: 'active',
        expires_at: null,
      }),
      recordGatewayTelemetry: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recordGatewayTelemetry', ...input });
        return {};
      },
    } as never,
  );

  await assert.rejects(
    () => service.ingestTelemetry(
      {
        external_device_id: 'meter-a1',
        readings: [{ metric_name: 'power_kw', metric_value: 8.4 }],
      },
      {
        tenantId: 'tenant-a',
        keyId: 'key-1',
        deviceToken: 'wrong-token',
        idempotencyKey: 'retry-1',
        timestamp: new Date().toISOString(),
      },
    ),
    /Invalid IoT device credential/i,
  );
  assert.deepEqual(calls, []);
});

test('IotGatewayService rejects gateway tenant headers that do not match the request tenant', async () => {
  const service = new IotGatewayService(
    {
      findFirstMissingModule: async () => {
        throw new Error('module access should not be checked for mismatched tenants');
      },
    } as never,
    {} as never,
    {
      getStore: () => ({ tenant_id: 'tenant-b' }),
    } as never,
  );

  await assert.rejects(
    () => service.ingestTelemetry(
      {
        external_device_id: 'meter-a1',
        readings: [{ metric_name: 'power_kw', metric_value: 8.4 }],
      },
      {
        tenantId: 'tenant-a',
        keyId: 'key-1',
        deviceToken: 'device-token-1',
        idempotencyKey: 'retry-1',
        timestamp: new Date().toISOString(),
      },
    ),
    /tenant header does not match/i,
  );
});

test('IotGatewayService returns an existing ingestion on duplicate idempotency keys', async () => {
  const service = new IotGatewayService(
    {
      findFirstMissingModule: async () => null,
    } as never,
    {
      findGatewayCredential: async () => ({
        id: 'credential-1',
        tenant_id: 'tenant-a',
        device_id: 'device-1',
        external_device_id: 'meter-a1',
        credential_hash: hashIotDeviceCredential('device-token-1'),
        status: 'active',
        expires_at: null,
      }),
      findGatewayIngestion: async () => ({
        id: 'ingestion-1',
        status: 'accepted',
        reading_count: 1,
      }),
      recordGatewayTelemetry: async () => {
        throw new Error('duplicate ingestion should not write readings');
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const result = await service.ingestTelemetry(
    {
      external_device_id: 'meter-a1',
      readings: [{ metric_name: 'power_kw', metric_value: 8.4 }],
    },
    {
      tenantId: 'tenant-a',
      keyId: 'key-1',
      deviceToken: 'device-token-1',
      idempotencyKey: 'retry-1',
      timestamp: new Date().toISOString(),
    },
  );

  assert.deepEqual(result, {
    id: 'ingestion-1',
    status: 'duplicate',
    reading_count: 1,
  });
});

test('IotGatewayService polls queued commands for the authenticated device', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new IotGatewayService(
    {
      findFirstMissingModule: async (tenantId: string, modules: string[]) => {
        calls.push({ method: 'findFirstMissingModule', tenant_id: tenantId, modules });
        return null;
      },
    } as never,
    {
      findGatewayCredential: async (input: Record<string, unknown>) => {
        calls.push({ method: 'findGatewayCredential', ...input });
        return {
          id: 'credential-1',
          tenant_id: input.tenant_id,
          device_id: 'device-1',
          external_device_id: 'meter-a1',
          credential_hash: hashIotDeviceCredential('device-token-1'),
          status: 'active',
          expires_at: null,
        };
      },
      pollGatewayCommands: async (input: Record<string, unknown>) => {
        calls.push({ method: 'pollGatewayCommands', ...input });
        return [
          {
            id: 'command-1',
            command_type: 'sync',
            payload: { reason: 'manual refresh' },
            priority: 'normal',
            status: 'sent',
          },
        ];
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ method: 'appendAuditLog', ...input });
      },
    } as never,
  );

  const result = await service.pollCommands(
    {
      external_device_id: 'meter-a1',
      limit: 5,
    },
    {
      tenantId: 'tenant-a',
      keyId: 'key-1',
      deviceToken: 'device-token-1',
      timestamp: new Date().toISOString(),
    },
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.commands.length, 1);
  assert.deepEqual(calls.map((call) => call.method), [
    'findFirstMissingModule',
    'findGatewayCredential',
    'pollGatewayCommands',
    'appendAuditLog',
  ]);
  assert.equal(calls[2]?.device_id, 'device-1');
});

test('IotGatewayService acknowledges command delivery for the authenticated device', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new IotGatewayService(
    {
      findFirstMissingModule: async () => null,
    } as never,
    {
      findGatewayCredential: async () => ({
        id: 'credential-1',
        tenant_id: 'tenant-a',
        device_id: 'device-1',
        external_device_id: 'meter-a1',
        credential_hash: hashIotDeviceCredential('device-token-1'),
        status: 'active',
        expires_at: null,
      }),
      acknowledgeGatewayCommand: async (input: Record<string, unknown>) => {
        calls.push({ method: 'acknowledgeGatewayCommand', ...input });
        return {
          id: input.command_id,
          status: input.status,
          result_metadata: input.result_metadata,
        };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ method: 'appendAuditLog', ...input });
      },
    } as never,
  );

  const result = await service.acknowledgeCommand(
    'command-1',
    {
      external_device_id: 'meter-a1',
      status: 'acknowledged',
      result_metadata: { firmware_result: 'ok' },
    },
    {
      tenantId: 'tenant-a',
      keyId: 'key-1',
      deviceToken: 'device-token-1',
      timestamp: new Date().toISOString(),
    },
  );

  assert.equal(result.status, 'acknowledged');
  assert.deepEqual(calls.map((call) => call.method), [
    'acknowledgeGatewayCommand',
    'appendAuditLog',
  ]);
  assert.equal(calls[0]?.device_id, 'device-1');
});
