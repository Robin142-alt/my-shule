# Implementation 101: IoT and Smart Campus

## Product Requirements

Implementation 101 adds a production-ready IoT and Smart Campus module to the school ERP. The module manages registered school devices, receives telemetry, raises operational alerts, and records command dispatches without pretending to integrate directly with hardware drivers. Device vendors, biometric scanners, GPS gateways, smart meters, lab sensors, and gate devices can post data through authenticated API gateways.

The module must support:
- Device registry with type, location, owner, health status, and last-seen tracking.
- Telemetry ingestion for numeric and structured readings such as temperature, humidity, GPS, power, attendance scans, door events, and safety readings.
- Alerting for offline devices, unsafe readings, security events, and maintenance conditions.
- Command dispatch records for actions such as sync, restart, calibrate, lock, unlock, and test signal.
- Principal/admin dashboard summaries for online devices, offline devices, open alerts, commands, and recent readings.
- Tenant isolation, module gating, permissions, audit logs, and no secret/device key exposure in UI.

## Technical Requirements

- Backend module code: `iot`.
- Frontend school section: `iot`.
- Module access code: `iot`.
- API route prefix: `/iot`.
- Frontend proxy: `/api/iot/[...path]`.
- Permissions: `iot:read`, `iot:write`.
- Required endpoints:
  - `GET /iot/dashboard`
  - `POST /iot/devices`
  - `POST /iot/telemetry`
  - `POST /iot/commands`
  - `PATCH /iot/alerts/:alertId/resolve`
- Required evidence:
  - Live UI workspace.
  - Live frontend API proxy.
  - Backend controller with module gating and permissions.
  - Persistent schema with forced RLS.
  - Workflow tests.
  - Implementation 101 certification artifact.

## App Flow

1. Admin or Principal opens `School > IoT`.
2. The dashboard loads live device health, readings, commands, and alerts.
3. Staff registers a device with a device type, location, and external device id.
4. Gateway posts telemetry readings to `/iot/telemetry`.
5. The backend records readings, updates device last-seen state, and opens alerts for critical readings.
6. Staff dispatches a command from the UI.
7. Staff resolves alerts after action is complete.

## UI/UX Design

The module follows the system theme:
- Dark Navy Blue for headers, buttons, and panels: `#071D49` to `#0B234F`.
- Orange Accent for actions and highlights: `#FF7A1A`.
- Light Gray / Off White backgrounds: `#F3F4F6`.
- Dark Text Blue: `#0F2345`.

The UI must be operational first: compact KPI cards, device health lists, telemetry readings, command form, alert resolution controls, and clear live API state. It must avoid marketing copy and avoid fake hardware status.

## Backend Schema

Tables:
- `iot_devices`: tenant-scoped device registry.
- `iot_telemetry_readings`: device readings and metadata.
- `iot_device_commands`: command dispatch records.
- `iot_alerts`: alert lifecycle records.
- `iot_audit_logs`: auditable module actions.

All tables require:
- `tenant_id`
- timestamps
- `audit_log_reference`
- forced row-level security
- tenant policy using `current_setting('app.tenant_id', true)` or system role bypass

## Production Acceptance

Implementation 101 is complete only when:
- `npm run implementation101:certify` passes.
- Backend IoT tests pass.
- Web IoT design tests pass.
- Web lint and build pass.
- Existing Implementation 100 certification remains passing.
