import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

export interface IotDashboardSummary {
  registered_devices: number;
  online_devices: number;
  offline_devices: number;
  open_alerts: number;
  commands_pending: number;
  readings_today: number;
  gateway_credentials: number;
  gateway_ingestions_today: number;
}

@Injectable()
export class IotRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDashboard(tenantId: string) {
    const [summary, devices, readings, commands, alerts] = await Promise.all([
      this.databaseService.query<IotDashboardSummary>(
        `
          SELECT
            (SELECT COUNT(*)::int FROM iot_devices WHERE tenant_id = $1) AS registered_devices,
            (SELECT COUNT(*)::int FROM iot_devices WHERE tenant_id = $1 AND status = 'online') AS online_devices,
            (SELECT COUNT(*)::int FROM iot_devices WHERE tenant_id = $1 AND status IN ('offline', 'maintenance')) AS offline_devices,
            (SELECT COUNT(*)::int FROM iot_alerts WHERE tenant_id = $1 AND status = 'open') AS open_alerts,
            (SELECT COUNT(*)::int FROM iot_device_commands WHERE tenant_id = $1 AND status IN ('queued', 'sent')) AS commands_pending,
            (SELECT COUNT(*)::int FROM iot_telemetry_readings WHERE tenant_id = $1 AND recorded_at >= CURRENT_DATE) AS readings_today,
            (SELECT COUNT(*)::int FROM iot_device_credentials WHERE tenant_id = $1 AND status = 'active') AS gateway_credentials,
            (SELECT COUNT(*)::int FROM iot_gateway_ingestions WHERE tenant_id = $1 AND accepted_at >= CURRENT_DATE) AS gateway_ingestions_today
        `,
        [tenantId],
      ),
      this.databaseService.query(
        `
          SELECT
            id::text,
            name,
            device_type,
            location_name,
            external_device_id,
            status,
            health_status,
            last_seen_at,
            created_at
          FROM iot_devices
          WHERE tenant_id = $1
          ORDER BY
            CASE status WHEN 'offline' THEN 1 WHEN 'maintenance' THEN 2 ELSE 3 END,
            name ASC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.databaseService.query(
        `
          SELECT
            reading.id::text,
            device.name AS device_name,
            reading.metric_name,
            reading.metric_value,
            reading.unit,
            reading.severity,
            reading.recorded_at
          FROM iot_telemetry_readings reading
          INNER JOIN iot_devices device
            ON device.tenant_id = reading.tenant_id
           AND device.id = reading.device_id
          WHERE reading.tenant_id = $1
          ORDER BY reading.recorded_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.databaseService.query(
        `
          SELECT
            command.id::text,
            device.name AS device_name,
            command.command_type,
            command.priority,
            command.status,
            command.created_at
          FROM iot_device_commands command
          INNER JOIN iot_devices device
            ON device.tenant_id = command.tenant_id
           AND device.id = command.device_id
          WHERE command.tenant_id = $1
          ORDER BY command.created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.databaseService.query(
        `
          SELECT
            alert.id::text,
            device.name AS device_name,
            alert.title,
            alert.message,
            alert.severity,
            alert.status,
            alert.created_at
          FROM iot_alerts alert
          LEFT JOIN iot_devices device
            ON device.tenant_id = alert.tenant_id
           AND device.id = alert.device_id
          WHERE alert.tenant_id = $1
            AND alert.status = 'open'
          ORDER BY
            CASE alert.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
            alert.created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
    ]);

    return {
      ...(summary.rows[0] ?? {
        registered_devices: 0,
        online_devices: 0,
        offline_devices: 0,
        open_alerts: 0,
        commands_pending: 0,
        readings_today: 0,
        gateway_credentials: 0,
        gateway_ingestions_today: 0,
      }),
      devices: devices.rows,
      readings: readings.rows,
      commands: commands.rows,
      alerts: alerts.rows,
    };
  }

  async registerDevice(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO iot_devices (
          tenant_id, name, device_type, location_name, external_device_id,
          installation_date, metadata, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, $7::jsonb, $8::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.name,
        input.device_type,
        input.location_name ?? null,
        input.external_device_id ?? null,
        input.installation_date ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async recordTelemetry(input: Record<string, unknown>) {
    return this.databaseService.withRequestTransaction(async () => {
      const result = await this.databaseService.query(
        `
          INSERT INTO iot_telemetry_readings (
            tenant_id, device_id, metric_name, metric_value, unit, severity,
            recorded_at, metadata, recorded_by_user_id
          )
          VALUES ($1, $2::uuid, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()), $8::jsonb, $9::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.device_id,
          input.metric_name,
          input.metric_value,
          input.unit ?? null,
          input.severity ?? 'normal',
          input.recorded_at ?? null,
          JSON.stringify(input.metadata ?? {}),
          input.recorded_by_user_id,
        ],
      );

      await this.databaseService.query(
        `
          UPDATE iot_devices
          SET status = 'online',
              health_status = CASE WHEN $3 IN ('warning', 'critical') THEN $3 ELSE 'ok' END,
              last_seen_at = NOW(),
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
        `,
        [input.tenant_id, input.device_id, input.severity ?? 'normal'],
      );

      if (input.severity === 'warning' || input.severity === 'critical') {
        await this.databaseService.query(
          `
            INSERT INTO iot_alerts (
              tenant_id, device_id, title, message, severity, metadata, created_by_user_id
            )
            VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, $7::uuid)
          `,
          [
            input.tenant_id,
            input.device_id,
            `${input.metric_name} ${input.severity}`,
            `IoT reading ${input.metric_name} reported ${input.metric_value}${input.unit ? ` ${input.unit}` : ''}.`,
            input.severity,
            JSON.stringify({ metric_name: input.metric_name, metric_value: input.metric_value }),
            input.recorded_by_user_id,
          ],
        );
      }

      return result.rows[0];
    });
  }

  async dispatchCommand(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO iot_device_commands (
          tenant_id, device_id, command_type, payload, priority, status, requested_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4::jsonb, $5, 'queued', $6::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.device_id,
        input.command_type,
        JSON.stringify(input.payload ?? {}),
        input.priority ?? 'normal',
        input.requested_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async issueDeviceCredential(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO iot_device_credentials (
          tenant_id, device_id, key_id, label, credential_hash, expires_at, created_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6::timestamptz, $7::uuid)
        RETURNING id::text, tenant_id, device_id::text, key_id, label, status, expires_at, created_at
      `,
      [
        input.tenant_id,
        input.device_id,
        input.key_id,
        input.label ?? null,
        input.credential_hash,
        input.expires_at ?? null,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async findGatewayCredential(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        SELECT
          credential.id::text,
          credential.tenant_id,
          credential.device_id::text,
          credential.key_id,
          credential.credential_hash,
          credential.status,
          credential.expires_at,
          device.external_device_id,
          device.name AS device_name
        FROM iot_device_credentials credential
        INNER JOIN iot_devices device
          ON device.tenant_id = credential.tenant_id
         AND device.id = credential.device_id
        WHERE credential.tenant_id = $1
          AND credential.key_id = $2
        LIMIT 1
      `,
      [input.tenant_id, input.key_id],
    );

    return result.rows[0];
  }

  async findGatewayIngestion(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        SELECT id::text, status, reading_count
        FROM iot_gateway_ingestions
        WHERE tenant_id = $1
          AND credential_id = $2::uuid
          AND idempotency_key = $3
        LIMIT 1
      `,
      [input.tenant_id, input.credential_id, input.idempotency_key],
    );

    return result.rows[0];
  }

  async recordGatewayTelemetry(input: Record<string, unknown>) {
    const readings = Array.isArray(input.readings) ? input.readings as Array<Record<string, unknown>> : [];

    return this.databaseService.withRequestTransaction(async () => {
      const ingestion = await this.databaseService.query(
        `
          INSERT INTO iot_gateway_ingestions (
            tenant_id, device_id, credential_id, idempotency_key, payload_sha256,
            reading_count, metadata
          )
          VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb)
          RETURNING id::text, status, reading_count
        `,
        [
          input.tenant_id,
          input.device_id,
          input.credential_id,
          input.idempotency_key,
          input.payload_sha256,
          readings.length,
          JSON.stringify(input.metadata ?? {}),
        ],
      );

      for (const reading of readings) {
        const telemetry = await this.databaseService.query(
          `
            INSERT INTO iot_telemetry_readings (
              tenant_id, device_id, metric_name, metric_value, unit, severity,
              recorded_at, metadata, recorded_by_user_id
            )
            VALUES ($1, $2::uuid, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()), $8::jsonb, NULL)
            RETURNING id::text
          `,
          [
            input.tenant_id,
            input.device_id,
            reading.metric_name,
            reading.metric_value,
            reading.unit ?? null,
            reading.severity ?? 'normal',
            reading.recorded_at ?? null,
            JSON.stringify(reading.metadata ?? {}),
          ],
        );

        if (reading.severity === 'warning' || reading.severity === 'critical') {
          await this.databaseService.query(
            `
              INSERT INTO iot_alerts (
                tenant_id, device_id, title, message, severity, metadata, created_by_user_id
              )
              VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, NULL)
            `,
            [
              input.tenant_id,
              input.device_id,
              `${reading.metric_name} ${reading.severity}`,
              `IoT gateway reading ${reading.metric_name} reported ${reading.metric_value}${reading.unit ? ` ${reading.unit}` : ''}.`,
              reading.severity,
              JSON.stringify({
                telemetry_reading_id: telemetry.rows[0]?.id,
                metric_name: reading.metric_name,
                metric_value: reading.metric_value,
              }),
            ],
          );
        }
      }

      await this.databaseService.query(
        `
          UPDATE iot_devices
          SET status = 'online',
              health_status = CASE
                WHEN EXISTS (
                  SELECT 1
                  FROM iot_telemetry_readings
                  WHERE tenant_id = $1
                    AND device_id = $2::uuid
                    AND severity = 'critical'
                    AND recorded_at >= NOW() - INTERVAL '15 minutes'
                ) THEN 'critical'
                WHEN EXISTS (
                  SELECT 1
                  FROM iot_telemetry_readings
                  WHERE tenant_id = $1
                    AND device_id = $2::uuid
                    AND severity = 'warning'
                    AND recorded_at >= NOW() - INTERVAL '15 minutes'
                ) THEN 'warning'
                ELSE 'ok'
              END,
              last_seen_at = NOW(),
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
        `,
        [input.tenant_id, input.device_id],
      );

      await this.databaseService.query(
        `
          UPDATE iot_device_credentials
          SET last_used_at = NOW(),
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
        `,
        [input.tenant_id, input.credential_id],
      );

      return ingestion.rows[0];
    });
  }

  async pollGatewayCommands(input: Record<string, unknown>) {
    const limit = Math.min(20, Math.max(1, Number(input.limit ?? 10)));

    return this.databaseService.withRequestTransaction(async () => {
      const result = await this.databaseService.query(
        `
          WITH pending AS (
            SELECT id
            FROM iot_device_commands
            WHERE tenant_id = $1
              AND device_id = $2::uuid
              AND status = 'queued'
            ORDER BY
              CASE priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                ELSE 4
              END,
              created_at ASC
            LIMIT $3
            FOR UPDATE SKIP LOCKED
          )
          UPDATE iot_device_commands command
          SET status = 'sent',
              sent_at = COALESCE(command.sent_at, NOW()),
              updated_at = NOW()
          FROM pending
          WHERE command.id = pending.id
          RETURNING
            command.id::text,
            command.command_type,
            command.payload,
            command.priority,
            command.status,
            command.created_at,
            command.sent_at
        `,
        [input.tenant_id, input.device_id, limit],
      );

      await this.touchGatewayCredential(input);

      return result.rows;
    });
  }

  async acknowledgeGatewayCommand(input: Record<string, unknown>) {
    return this.databaseService.withRequestTransaction(async () => {
      const result = await this.databaseService.query(
        `
          UPDATE iot_device_commands
          SET status = $4,
              acknowledged_at = NOW(),
              result_metadata = $5::jsonb,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND device_id = $2::uuid
            AND id = $3::uuid
            AND status IN ('queued', 'sent')
          RETURNING
            id::text,
            command_type,
            payload,
            priority,
            status,
            sent_at,
            acknowledged_at,
            result_metadata
        `,
        [
          input.tenant_id,
          input.device_id,
          input.command_id,
          input.status,
          JSON.stringify(input.result_metadata ?? {}),
        ],
      );

      await this.touchGatewayCredential(input);

      return result.rows[0];
    });
  }

  async resolveAlert(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        UPDATE iot_alerts
        SET status = 'resolved',
            resolved_by_user_id = $3::uuid,
            resolved_at = NOW(),
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
        INSERT INTO iot_audit_logs (
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

  private async touchGatewayCredential(input: Record<string, unknown>) {
    if (!input.credential_id) {
      return;
    }

    await this.databaseService.query(
      `
        UPDATE iot_device_credentials
        SET last_used_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [input.tenant_id, input.credential_id],
    );
  }
}
