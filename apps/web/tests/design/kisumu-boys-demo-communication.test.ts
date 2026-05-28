import {
  createKisumuBoysHighCommunicationHarness,
  getKisumuBoysHighDemoScenario,
  kisumuBoysDependencyLoops,
  scoreKisumuBoysHighDemoReadiness,
} from "@/lib/demo/kisumu-boys-high-demo";

describe("Kisumu Boys High demo communication fabric", () => {
  it("loads a high-density tenant demo that spans daily school operations", () => {
    const scenario = getKisumuBoysHighDemoScenario();

    expect(scenario.tenant).toEqual(
      expect.objectContaining({
        tenantId: "kisumu-boys",
        schoolName: "Kisumu Boys High",
      }),
    );
    expect(scenario.records.students.length).toBeGreaterThanOrEqual(12);
    expect(scenario.records.staff.length).toBeGreaterThanOrEqual(10);
    expect(scenario.records.feePayments.length).toBeGreaterThanOrEqual(8);
    expect(scenario.records.attendanceMarks.length).toBeGreaterThanOrEqual(10);
    expect(scenario.records.clinicVisits.length).toBeGreaterThanOrEqual(6);
    expect(scenario.records.medicineStock.length).toBeGreaterThanOrEqual(6);
    expect(scenario.records.visitorLogs.length).toBeGreaterThanOrEqual(6);
    expect(scenario.records.libraryLoans.length).toBeGreaterThanOrEqual(6);
    expect(scenario.records.inventoryMovements.length).toBeGreaterThanOrEqual(8);
    expect(scenario.records.assets.length).toBeGreaterThanOrEqual(8);
    expect(scenario.records.boardingRollCalls.length).toBeGreaterThanOrEqual(4);
    expect(scenario.records.transportTrips.length).toBeGreaterThanOrEqual(5);
    expect(scenario.records.disciplineCases.length).toBeGreaterThanOrEqual(5);
    expect(scenario.records.admissions.length).toBeGreaterThanOrEqual(5);
    expect(scenario.records.examBatches.length).toBeGreaterThanOrEqual(5);

    expect(Array.from(new Set(scenario.events.map((event) => event.type)))).toEqual(
      expect.arrayContaining([
        "FEE_PAYMENT_COMPLETED",
        "ATTENDANCE_UPDATED",
        "MEDICINE_DISPENSED",
        "VISITOR_CHECKED_IN",
        "LIBRARY_BOOK_OVERDUE",
        "DISCIPLINE_CASE_CREATED",
        "ASSET_ISSUED",
        "STUDENT_ADMITTED",
        "BUS_ROUTE_CHANGED",
        "BOARDING_ROLL_CALL_MISSING",
      ]),
    );

    for (const event of scenario.events) {
      expect(event.tenantId).toBe("kisumu-boys");
      expect(event.sourceModule).toBeTruthy();
      expect(event.entityId).toBeTruthy();
      expect(event.payload.auditId).toEqual(expect.stringMatching(/^audit\.kisumu-boys\./));
      expect(event.payload.targetDashboards).toEqual(expect.arrayContaining(["principal"]));
    }
  });

  it("propagates every dependency-loop action into the dashboards that should update", () => {
    const harness = createKisumuBoysHighCommunicationHarness();

    harness.emitAll();

    for (const loop of kisumuBoysDependencyLoops) {
      for (const dashboard of loop.targetDashboards) {
        const state = harness.getWidgetState(loop.widgetIdByDashboard[dashboard]);

        expect(state).toEqual(
          expect.objectContaining({
            state: "ACTIVE",
            lastEventId: loop.eventId,
          }),
        );
        expect(harness.getNotificationsForRole(dashboard)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              eventType: loop.eventType,
              title: loop.notificationTitle,
            }),
          ]),
        );
      }
    }
  });

  it("scores the KB High demo at full readiness with no missing dashboards, queues, or events", () => {
    const score = scoreKisumuBoysHighDemoReadiness();

    expect(score.score).toBe(100);
    expect(score.missing).toEqual([]);
    expect(score.dashboardCount).toBeGreaterThanOrEqual(24);
    expect(score.eventCount).toBeGreaterThanOrEqual(20);
    expect(score.widgetCount).toBeGreaterThanOrEqual(35);
    expect(score.queueCount).toBeGreaterThanOrEqual(24);
  });

  it("keeps enough demo operations to certify every role dashboard, not just a few showcase cards", () => {
    const scenario = getKisumuBoysHighDemoScenario();
    const recordCount = Object.values(scenario.records).reduce((total, rows) => total + rows.length, 0);

    expect(recordCount).toBeGreaterThanOrEqual(360);
    expect(scenario.events.length).toBeGreaterThanOrEqual(180);

    for (const role of scenario.dashboards) {
      const roleEvents = scenario.events.filter((event) => event.payload.targetDashboards.includes(role));

      expect(roleEvents.length).toBeGreaterThanOrEqual(8);
      expect(new Set(roleEvents.map((event) => event.sourceModule)).size).toBeGreaterThanOrEqual(
        role === "principal" ? 12 : 1,
      );
      expect(new Set(roleEvents.map((event) => event.payload.queue)).size).toBeGreaterThanOrEqual(4);
      expect(roleEvents.every((event) => event.payload.action.length > 10)).toBe(true);
    }
  });
});
