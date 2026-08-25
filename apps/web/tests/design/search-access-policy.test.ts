import { resolveOperationalSearch } from "@/lib/search/operational-search-resolver";
import type { OperationalSearchRecord } from "@/lib/search/operational-search-registry";
import { resolveSearchPolicy } from "@/lib/search/search-access-policy";

const action = (label: string, capability?: string) => ({
  label,
  href: "/test-only",
  auditEvent: `TEST_${label.toUpperCase().replace(/\s+/g, "_")}`,
  capability,
});

const tenantRecords: OperationalSearchRecord[] = [
  {
    id: "student-1",
    type: "student",
    typeLabel: "Student",
    title: "Brian Otieno",
    detail: "Admission MYS/2026/001",
    keywords: "Brian student learner",
    scopeTags: [
      "school-wide",
      "executive",
      "operations",
      "front-office",
      "finance",
      "teacher-assigned",
      "class-teacher-owned",
      "grade-owned",
      "own-child",
    ],
    actions: [action("View Profile", "students:view"), action("View Fee Balance", "finance:view")],
  },
  {
    id: "receipt-1",
    type: "receipt",
    typeLabel: "Receipt",
    title: "QEX7ABC123 fee receipt",
    detail: "KES 18,500",
    keywords: "QEX7ABC123 receipt",
    scopeTags: ["finance"],
    actions: [action("View Receipt", "finance:view")],
  },
  {
    id: "mpesa-1",
    type: "mpesa",
    typeLabel: "M-Pesa",
    title: "QEX7ABC123 callback",
    detail: "Matched payment",
    keywords: "QEX7ABC123 mpesa",
    scopeTags: ["finance"],
    actions: [action("Open Reconciliation", "finance:reconcile")],
  },
  {
    id: "health-1",
    type: "healthCase",
    typeLabel: "Health",
    title: "Clinic follow-up",
    detail: "Fever review",
    keywords: "clinic follow-up",
    scopeTags: ["clinic-permitted"],
    actions: [action("Open Clinic Case", "clinic:view")],
  },
  {
    id: "discipline-1",
    type: "disciplineCase",
    typeLabel: "Discipline",
    title: "Bullying investigation",
    detail: "Parent meeting pending",
    keywords: "bullying investigation",
    scopeTags: ["discipline-permitted"],
    actions: [action("Open Case", "discipline:view")],
  },
  {
    id: "assignment-1",
    type: "assignment",
    typeLabel: "Assignment",
    title: "Fractions assignment",
    detail: "Due Friday",
    keywords: "assignment homework",
    scopeTags: ["self", "own-child", "teacher-assigned"],
    actions: [action("Open Assignment", "assignments:view")],
  },
  {
    id: "tenant-1",
    type: "platformTenant",
    typeLabel: "Tenant",
    title: "Greenfield Academy",
    detail: "Active",
    keywords: "Greenfield tenant",
    scopeTags: ["platform"],
    actions: [action("Open Tenant", "platform:view")],
  },
  {
    id: "job-1",
    type: "systemJob",
    typeLabel: "System Job",
    title: "Event replay worker",
    detail: "Healthy",
    keywords: "event replay",
    scopeTags: ["platform-health"],
    actions: [action("Open Job", "system:view")],
  },
];

function search(query: string, role: string) {
  return resolveOperationalSearch(query, { role, records: tenantRecords });
}

describe("Implementation 142 role-aware search access policy", () => {
  it("allows full global search only for principal, deputy, secretary, and accountant families", () => {
    expect(resolveSearchPolicy("principal").mode).toBe("GLOBAL_EXECUTIVE");
    expect(resolveSearchPolicy("deputy-principal").mode).toBe("GLOBAL_OPERATIONS");
    expect(resolveSearchPolicy("secretary").mode).toBe("GLOBAL_FRONT_OFFICE");
    expect(resolveSearchPolicy("accountant").mode).toBe("GLOBAL_FINANCE");

    expect(resolveSearchPolicy("teacher").mode).toBe("ROLE_SCOPED");
    expect(resolveSearchPolicy("class-teacher").mode).toBe("ROLE_SCOPED");
    expect(resolveSearchPolicy("parent").mode).toBe("SELF_ONLY");
    expect(resolveSearchPolicy("student").mode).toBe("SELF_ONLY");
    expect(resolveSearchPolicy("nurse").mode).toBe("SENSITIVE_SCOPED");
    expect(resolveSearchPolicy("system-monitor").mode).toBe("PLATFORM_HEALTH");
  });

  it("keeps finance-wide results out of teacher search", () => {
    const teacherResults = search("QEX7ABC123", "teacher");
    const accountantResults = search("QEX7ABC123", "accountant");

    expect(teacherResults).toHaveLength(0);
    expect(accountantResults.map((result) => result.type)).toEqual(
      expect.arrayContaining(["receipt", "mpesa"]),
    );
  });

  it("removes fee-balance actions from teacher, class-teacher, and grade-master student search", () => {
    for (const role of ["teacher", "class-teacher", "grade-master"]) {
      const student = search("Brian", role)[0];
      expect(student).toBeDefined();
      expect(student.actions.map((item) => item.label)).not.toContain("View Fee Balance");
    }

    for (const role of ["principal", "deputy-principal", "secretary", "accountant"]) {
      const student = search("Brian", role)[0];
      expect(student).toBeDefined();
      expect(student.actions.map((item) => item.label)).toContain("View Fee Balance");
    }
  });

  it("keeps sensitive case searches inside sensitive role scopes", () => {
    const accountantResults = search("clinic follow-up", "accountant");
    const nurseResults = search("clinic follow-up", "nurse");
    const counsellorResults = search("bullying investigation", "guidance-counselling");
    const disciplineResults = search("bullying investigation", "discipline-master");

    expect(accountantResults).toHaveLength(0);
    expect(nurseResults.map((result) => result.type)).toContain("healthCase");
    expect(counsellorResults).toHaveLength(0);
    expect(disciplineResults.map((result) => result.type)).toContain("disciplineCase");
  });

  it("limits parent and student portals to self-owned records", () => {
    const parentResults = search("Brian", "parent");
    const parentPlatformResults = search("Greenfield", "parent");
    const studentFeeResults = search("QEX7ABC123", "student");
    const studentAssignmentResults = search("assignment", "student");

    expect(parentResults.map((result) => result.type)).toContain("student");
    expect(parentPlatformResults).toHaveLength(0);
    expect(studentFeeResults).toHaveLength(0);
    expect(studentAssignmentResults.map((result) => result.type)).toContain("assignment");
  });

  it("keeps platform health search focused on operational infrastructure", () => {
    const monitorResults = search("event replay", "system-monitor");
    const monitorStudentResults = search("Brian", "system-monitor");

    expect(monitorResults.map((result) => result.type)).toContain("systemJob");
    expect(monitorStudentResults).toHaveLength(0);
  });

  it("does not invent school records when no tenant-scoped search response is supplied", () => {
    expect(resolveOperationalSearch("Brian", { role: "principal" })).toEqual([]);
    expect(resolveOperationalSearch("QEX7ABC123", { role: "accountant" })).toEqual([]);
  });
});
