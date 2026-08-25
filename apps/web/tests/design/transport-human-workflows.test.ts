import fs from "node:fs";
import path from "node:path";

describe("transport manager human workflow contracts", () => {
  it("uses school-scoped dropdowns for allocation and maintenance workflows", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"),
      "utf8",
    );

    expect(source).toMatch(/admin-command\/transport-manager\/assignment-options/);
    expect(source).toMatch(/<select[\s\S]+name="route_id"/);
    expect(source).toMatch(/<select[\s\S]+name="student_id"/);
    expect(source).toMatch(/<select[\s\S]+name="pickup_stop_id"/);
    expect(source).toMatch(/<select[\s\S]+name="dropoff_stop_id"/);
    expect(source).toMatch(/<select[\s\S]+name="vehicle_id"/);
    expect(source).not.toMatch(/Transport Manifest ID|Route manifest UUID|Student ID|Student UUID|Pickup Stop ID|Drop-off Stop ID|Optional pickup stop UUID|Optional drop-off stop UUID|Vehicle UUID/);
  });

  it("renders canonical route, vehicle, trip, and minor-unit fuel fields without fabricated progress or live records", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"),
      "utf8",
    );

    expect(source).toContain("v.assigned_driver || v.driver");
    expect(source).toContain('v.assigned_route || "Route not assigned"');
    expect(source).toContain('route.driver || "Driver not assigned"');
    expect(source).toContain('route.vehicle || "Vehicle not assigned"');
    expect(source).toContain('log.vehicle || "Vehicle not recorded"');
    expect(source).toContain("moneyMinorLabel(log.cost_minor)");
    expect(source).toContain("metrics.fuel_cost_this_month_minor");
    expect(source).toContain("trip.departure_time");
    expect(source).toContain("trip.arrival_time");
    expect(source).not.toMatch(/overviewKpis|function ProgressBar|StatusChip label="Live"|rows=\{\[\]\}|Send SMS to Parents|Live records/);
    expect(source).not.toContain("log.vehicle_registration");
    expect(source).not.toContain("moneyLabel(log.cost)");
  });

  it("queues notices only for selected transport guardians and loads persisted notice and incident feeds", () => {
    const repoRoot = path.resolve(process.cwd(), "../..");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/transport-manager-command-center.tsx"),
      "utf8",
    );
    const serviceSource = fs.readFileSync(
      path.join(repoRoot, "apps/api/src/modules/admin-command/transport-manager-command.service.ts"),
      "utf8",
    );
    const sendNoticeStart = serviceSource.indexOf("async sendNotice(dto: any)");
    const sendNoticeSource = serviceSource.slice(sendNoticeStart);

    expect(source).toContain('/api/admin-command/transport-manager/notices');
    expect(source).toContain('/api/admin-command/transport-manager/incidents');
    expect(source).toMatch(/route_id:\s*routeId \|\| undefined/);
    expect(source).toMatch(/student_ids:\s*studentId \? \[studentId\] : \[\]/);
    expect(source).toContain('recipient_scope: "linked_transport_guardians"');
    expect(source).toContain('value="sms"');
    expect(source).toContain("result.sms_queued");
    expect(source).not.toContain("target_roles");
    expect(source).not.toMatch(/Transport notice sent|notice was not sent/);

    expect(sendNoticeStart).toBeGreaterThanOrEqual(0);
    expect(sendNoticeSource).toContain("FROM transport_manifest_students manifest_student");
    expect(sendNoticeSource).toContain("LEFT JOIN student_guardians guardian");
    expect(sendNoticeSource).toContain("INSERT INTO communication_sms_outbox");
    expect(sendNoticeSource).toContain("INSERT INTO notifications");
    expect(sendNoticeSource).toContain("'transport.notice_queued'");
    expect(sendNoticeSource).toContain("INSERT INTO audit_logs");
    expect(sendNoticeSource).not.toContain("notifyRoles");
    expect(sendNoticeSource).not.toContain("transport.notice_sent");
  });
});
