import {
  addSchoolRecord,
  createNotification,
  getSchoolScopedStorageKey,
  publishSchoolOperationalEvent,
  readSchoolData,
  simulateSms,
  subscribeToSchoolDataUpdates,
} from "@/lib/school/school-operational-store";

describe("school operational store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps school records isolated by school-scoped storage keys", () => {
    addSchoolRecord("finance-payments", { id: "pay-1", student: "Brian Otieno", amount: 12000 }, "kb-high");
    addSchoolRecord("finance-payments", { id: "pay-2", student: "Faith Akinyi", amount: 8000 }, "green-valley");

    expect(readSchoolData<{ id: string; student: string; schoolId?: string }>("finance-payments", "kb-high")).toEqual([
      expect.objectContaining({ id: "pay-1", schoolId: "kb-high" }),
    ]);
    expect(readSchoolData<{ id: string; student: string; schoolId?: string }>("finance-payments", "green-valley")).toEqual([
      expect.objectContaining({ id: "pay-2", schoolId: "green-valley" }),
    ]);
    expect(window.localStorage.getItem("finance-payments")).toBeNull();
    expect(window.localStorage.getItem(getSchoolScopedStorageKey("kb-high", "finance-payments"))).toContain("Brian Otieno");
  });

  it("publishes school events with audit logs, notifications, and SMS logs", () => {
    publishSchoolOperationalEvent({
      schoolId: "kb-high",
      type: "FEE_PAYMENT_RECORDED",
      module: "finance",
      actorRole: "accountant",
      title: "Brian Otieno fee payment recorded",
      body: "KSh 12,000 received by M-Pesa.",
      entityId: "pay-1",
      severity: "success",
      notifications: [{ audienceRoles: ["principal", "parent"], title: "Fee payment recorded" }],
      sms: [{ recipient: "0712345678", message: "Receipt KBI-RCPT-1100 is ready." }],
    });

    expect(readSchoolData("events", "kb-high")).toEqual([
      expect.objectContaining({ type: "FEE_PAYMENT_RECORDED", schoolId: "kb-high" }),
    ]);
    expect(readSchoolData("auditLogs", "kb-high")).toEqual([
      expect.objectContaining({ action: "FEE_PAYMENT_RECORDED", actorRole: "accountant" }),
    ]);
    expect(readSchoolData("notifications", "kb-high")).toEqual([
      expect.objectContaining({ audienceRoles: ["principal", "parent"], read: false }),
    ]);
    expect(readSchoolData("smsLogs", "kb-high")).toEqual([
      expect.objectContaining({ recipient: "0712345678", status: "Sent" }),
    ]);
  });

  it("announces school-scoped updates so open dashboards can refresh", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToSchoolDataUpdates(listener);

    createNotification({
      schoolId: "kb-high",
      audienceRoles: ["principal"],
      sourceModule: "visitors",
      title: "Visitor checked in",
      body: "Grace Njeri is inside the school.",
      severity: "info",
    });
    simulateSms({
      schoolId: "kb-high",
      recipient: "0712345678",
      message: "Visitor checked in.",
      sourceModule: "visitors",
    });

    expect(listener).toHaveBeenCalledWith({ schoolId: "kb-high", moduleName: "notifications" });
    expect(listener).toHaveBeenCalledWith({ schoolId: "kb-high", moduleName: "smsLogs" });

    unsubscribe();
  });
});
