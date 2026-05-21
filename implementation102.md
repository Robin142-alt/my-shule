# Implementation 102: IoT Device Gateway

## Goal

Upgrade IoT and Smart Campus from a staff-operated module into a gateway-ready production module that can safely accept real device telemetry without sharing staff credentials with hardware.

## Scope

- Public HTTPS device gateway endpoint for telemetry ingestion.
- Tenant-scoped device credentials with one-time secret return and one-way stored hashes.
- Idempotency keys for safe retries from intermittent networks.
- Gateway ingestion ledger for auditability and duplicate detection.
- Device heartbeat behavior through telemetry ingestion and credential last-used tracking.
- Frontend controls for issuing gateway credentials from the IoT workspace.
- Certification gate proving the gateway is not a half-working stub.

## Non-Goals

- Vendor-specific firmware or hardware drivers.
- MQTT broker hosting.
- Raw secret storage.
- Device command polling from hardware. Command queueing already exists; polling can be a later vendor adapter.

## Gateway API

### Staff Endpoint

`POST /iot/devices/:deviceId/credentials`

Creates a device credential for an existing IoT device. The response returns the token once. Only the token hash is persisted.

### Device Endpoint

`POST /iot/gateway/telemetry`

Required headers:

- `x-iot-tenant-id`
- `x-iot-key-id`
- `x-iot-device-token`
- `x-iot-idempotency-key`
- `x-iot-timestamp`

Request body:

```json
{
  "external_device_id": "meter-a1",
  "readings": [
    {
      "metric_name": "power_kw",
      "metric_value": 8.4,
      "unit": "kw",
      "severity": "normal",
      "metadata": {
        "source": "gateway"
      }
    }
  ],
  "metadata": {
    "firmware": "1.0.0"
  }
}
```

## Security Requirements

- Device credentials are tenant-scoped and device-scoped.
- The gateway never accepts staff JWTs as device credentials.
- Device tokens are hashed before storage and compared using constant-time comparison.
- Duplicate idempotency keys return the existing ingestion result instead of duplicating readings.
- Gateway tables use forced row-level security.
- Gateway audit logs contain hashes and ids, not device secrets.

## Acceptance Criteria

- Gateway telemetry can be ingested by a device without a staff session.
- Invalid, expired, inactive, or mismatched credentials are rejected before writes.
- Duplicate retries are idempotent.
- Dashboard shows gateway credential and ingestion counts.
- The IoT workspace can issue a credential for a registered device.
- Focused backend tests, frontend design tests, and Implementation 102 certification pass.
