# Implementation 103: IoT Command Delivery Gateway

## Goal

Complete the IoT hardware loop by allowing authenticated devices to fetch queued commands and acknowledge command results through the existing HTTPS gateway.

## Scope

- Public device command polling endpoint.
- Public device command acknowledgement endpoint.
- Reuse tenant-scoped device credentials from Implementation 102.
- Mark queued commands as sent when delivered to a device.
- Mark sent commands as acknowledged or failed with result metadata.
- Preserve tenant, device, and credential boundaries.
- Add certification and tests so command delivery cannot regress silently.

## Gateway API

### Poll Commands

`POST /iot/gateway/commands/poll`

Headers:

- `x-iot-tenant-id`
- `x-iot-key-id`
- `x-iot-device-token`
- `x-iot-timestamp`

Body:

```json
{
  "external_device_id": "meter-a1",
  "limit": 5
}
```

Returns queued commands for the authenticated device and marks them as `sent`.

### Acknowledge Command

`POST /iot/gateway/commands/:commandId/ack`

Headers:

- `x-iot-tenant-id`
- `x-iot-key-id`
- `x-iot-device-token`
- `x-iot-timestamp`

Body:

```json
{
  "external_device_id": "meter-a1",
  "status": "acknowledged",
  "result_metadata": {
    "firmware_result": "ok"
  }
}
```

Valid statuses are `acknowledged` and `failed`.

## Acceptance Criteria

- Devices can fetch only their own commands.
- Polling changes queued commands to sent.
- Acknowledgement cannot update commands for another device.
- Failed acknowledgements store result metadata.
- Gateway authentication, tenant mismatch checks, and module enablement are reused.
- Focused tests, certification, and existing regressions pass.
